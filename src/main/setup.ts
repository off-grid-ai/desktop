// Unified setup + system-health surface. Two jobs:
//   1. getSystemHealth() — one aggregated snapshot of every local component
//      (chat LLM / gateway / vision / embeddings / STT / TTS / image gen) so the
//      Settings → Health panel can show what's running at a glance.
//   2. autoConfigure() — the "Configure for me" action: pick a model that fits
//      this machine's RAM, download it, activate it, start llama-server, verify.
//
// Everything here is on-device; no network except the model download itself.
import os from 'os';
import * as http from 'http';
import { llm } from './llm';
import { getActiveModel, downloadModel, listInstalled, setActiveModel } from './models-manager';

export type ComponentStatus = 'ready' | 'starting' | 'down' | 'not_installed';

export interface HealthComponent {
  id: string;
  label: string;
  status: ComponentStatus;
  detail?: string;
  port?: number;
  /** True if the renderer can offer a "restart" affordance for this component. */
  canRestart?: boolean;
}

export interface SystemHealth {
  ramGb: number;
  activeModel: string | null;
  components: HealthComponent[];
}

export interface SetupProgress {
  phase: 'select' | 'download' | 'activate' | 'start' | 'verify' | 'done' | 'error';
  message: string;
  modelId?: string;
  modelName?: string;
  percent?: number;
  downloadedMB?: string;
  totalMB?: string;
}
export type SetupProgressCb = (p: SetupProgress) => void;

const LLAMA_PORT = 8439;
const GATEWAY_PORT = 7878;

/** GET a localhost endpoint, parse JSON, with a short timeout. null on any failure. */
function pingJson(port: number, path = '/health', timeoutMs = 1500): Promise<unknown | null> {
  return new Promise((resolve) => {
    const req = http.get({ host: '127.0.0.1', port, path, timeout: timeoutMs }, (res) => {
      if (!res.statusCode || res.statusCode >= 400) { res.resume(); resolve(null); return; }
      let body = '';
      res.on('data', (c) => { body += c; });
      res.on('end', () => { try { resolve(JSON.parse(body)); } catch { resolve(body ? {} : null); } });
    });
    req.on('error', () => resolve(null));
    req.on('timeout', () => { req.destroy(); resolve(null); });
  });
}

function ramGb(): number {
  return Math.round(os.totalmem() / 1e9);
}

/** One aggregated snapshot of every local component. */
export async function getSystemHealth(): Promise<SystemHealth> {
  const activeModel = getActiveModel();
  const modelsExist = llm.modelsExist();

  // Live probes (run in parallel): the chat server and the gateway.
  const [llamaHealth, gatewayHealth] = await Promise.all([
    pingJson(LLAMA_PORT),
    pingJson(GATEWAY_PORT),
  ]);

  // Image generation is checked in-process (no HTTP) so it works even if the
  // gateway is down.
  let image: { available: boolean; reason?: string } = { available: false };
  try {
    const { imageGenStatus } = await import('./imagegen');
    const s = imageGenStatus();
    image = { available: s.available, reason: s.reason };
  } catch { /* imagegen unavailable */ }

  const gw = (gatewayHealth ?? {}) as { modalities?: Record<string, string> };
  const modality = (k: string): ComponentStatus => {
    if (!gatewayHealth) return 'down';
    const v = gw.modalities?.[k];
    return v === 'ready' ? 'ready' : v === 'not_installed' ? 'not_installed' : 'down';
  };

  // Chat LLM (llama-server). ready = /health answers. starting = a model is
  // present and we've kicked off init but it isn't answering yet. not_installed =
  // no model on disk. down = model present but server isn't coming up.
  let chat: ComponentStatus;
  let chatDetail: string | undefined;
  if (llamaHealth) { chat = 'ready'; chatDetail = activeModel ?? undefined; }
  else if (!modelsExist) { chat = 'not_installed'; chatDetail = 'No model installed'; }
  else if (llm.isReady()) { chat = 'starting'; chatDetail = 'Warming up…'; }
  else { chat = 'down'; chatDetail = 'Model installed but server is not running'; }

  const components: HealthComponent[] = [
    { id: 'chat', label: 'Chat model (llama-server)', status: chat, detail: chatDetail, port: LLAMA_PORT, canRestart: modelsExist },
    { id: 'gateway', label: 'Local gateway', status: gatewayHealth ? 'ready' : 'down', detail: gatewayHealth ? 'OpenAI-compatible API' : 'Not responding', port: GATEWAY_PORT, canRestart: true },
    { id: 'vision', label: 'Vision (image understanding)', status: modality('vision_understanding') },
    { id: 'embeddings', label: 'Embeddings (search/RAG)', status: modality('embeddings') },
    { id: 'transcription', label: 'Speech-to-text (whisper)', status: modality('transcription') },
    { id: 'speech', label: 'Text-to-speech', status: modality('speech') },
    {
      id: 'image',
      label: 'Image generation',
      status: image.available ? 'ready' : 'not_installed',
      detail: image.available ? undefined : (image.reason ?? 'No image model installed'),
    },
  ];

  return { ramGb: ramGb(), activeModel, components };
}

/** Choose the best chat/vision model that fits this machine's RAM. Prefers a
 *  vision model (so chat supports images) at the largest size the RAM tier
 *  allows; falls back to text, then to a safe small default. */
export async function recommendChatModel(): Promise<{ id: string; name: string } | null> {
  const { CATALOG, recommendForRam } = await import('@offgrid/models');
  const gb = ramGb();
  const tier = recommendForRam(gb);
  const totalBytes = (m: { files: { sizeBytes?: number }[] }): number =>
    m.files.reduce((s, f) => s + (f.sizeBytes ?? 0), 0);
  // Weights must fit COMFORTABLY in RAM, scaled by the resource-usage mode:
  // Conservative ≈ 30%, Balanced ≈ 38%, Extreme ≈ 55% of total RAM. (A model that
  // merely "fits" by params can still freeze the machine once its KV cache is
  // allocated — that's what happened with an 8B model at 64k on a 16GB Mac.)
  let frac = 0.38;
  try {
    const mode = (llm.getSettings() as { performanceMode?: string }).performanceMode;
    frac = mode === 'conservative' ? 0.30 : mode === 'extreme' ? 0.55 : 0.38;
  } catch { /* default */ }
  const weightBudget = gb * frac * 1e9;
  const eligible = (m: (typeof CATALOG)[number]): boolean =>
    (m.kind === 'text' || m.kind === 'vision') &&
    (m.params ?? 999) <= tier.maxParams &&
    (m.minRamGb ?? 0) <= gb;
  const byPreference = (a: (typeof CATALOG)[number], b: (typeof CATALOG)[number]): number =>
    // vision first (so chat handles images), then the largest that still fits the budget
    Number(b.kind === 'vision') - Number(a.kind === 'vision') ||
    (b.params ?? 0) - (a.params ?? 0);

  const comfy = CATALOG.filter((m) => eligible(m) && totalBytes(m) <= weightBudget).sort(byPreference);
  // Fall back progressively: comfy fit → any param-eligible → smallest text model.
  const pick =
    comfy[0] ??
    CATALOG.filter(eligible).sort((a, b) => totalBytes(a) - totalBytes(b))[0] ??
    CATALOG.filter((m) => m.kind === 'text').sort((a, b) => totalBytes(a) - totalBytes(b))[0];
  return pick ? { id: pick.id, name: pick.name } : null;
}

export interface FitEstimate {
  level: 'ok' | 'tight' | 'risky';
  ramGb: number;
  weightsGb: number;
  message: string;
}

/** Estimate whether a model fits this machine's RAM comfortably, for a pre-activate
 *  warning. 'ok' = plenty of headroom; 'tight' = works but context will be reduced;
 *  'risky' = weights alone are a large fraction of RAM (slow / may fail to load). */
export async function estimateModelFit(modelId: string): Promise<FitEstimate> {
  const gb = ramGb();
  try {
    const { CATALOG, resolveHuggingFaceModel } = await import('@offgrid/models');
    const entry = CATALOG.find((m) => m.id === modelId) ?? (await resolveHuggingFaceModel(modelId));
    const weightsGb = (entry?.files?.reduce((s: number, f: { sizeBytes?: number }) => s + (f.sizeBytes ?? 0), 0) ?? 0) / 1e9;
    if (!weightsGb) return { level: 'ok', ramGb: gb, weightsGb: 0, message: '' };
    const level: FitEstimate['level'] = weightsGb <= gb * 0.38 ? 'ok' : weightsGb <= gb * 0.55 ? 'tight' : 'risky';
    const message =
      level === 'ok'
        ? ''
        : level === 'tight'
          ? `This model's weights are ~${weightsGb.toFixed(1)} GB of your ${gb} GB. It'll run, but its context window will be reduced to stay within memory.`
          : `This model's weights are ~${weightsGb.toFixed(1)} GB on a ${gb} GB machine — it may run slowly, use heavy swap, or fail to load. Context will be heavily reduced. Consider a smaller model.`;
    return { level, ramGb: gb, weightsGb, message };
  } catch {
    return { level: 'ok', ramGb: gb, weightsGb: 0, message: '' };
  }
}

/** "Configure for me": pick → download (if needed) → activate → start → verify. */
export async function autoConfigure(onProgress?: SetupProgressCb): Promise<{ success: boolean; error?: string; modelId?: string; modelName?: string }> {
  const emit = (p: SetupProgress): void => { try { onProgress?.(p); } catch { /* ignore */ } };

  emit({ phase: 'select', message: 'Picking a model that fits your Mac…' });
  const model = await recommendChatModel();
  if (!model) { emit({ phase: 'error', message: 'No suitable model found.' }); return { success: false, error: 'no suitable model found' }; }

  const installed = await listInstalled();
  if (!installed.includes(model.id)) {
    emit({ phase: 'download', message: `Downloading ${model.name}…`, modelId: model.id, modelName: model.name, percent: 0 });
    const res = await downloadModel(model.id, (p) =>
      emit({
        phase: 'download',
        message: `Downloading ${model.name}…`,
        modelId: model.id,
        modelName: model.name,
        percent: p.percent,
        downloadedMB: p.downloadedMB,
        totalMB: p.totalMB,
      }),
    );
    if (!res.success) { emit({ phase: 'error', message: res.error ?? 'Download failed.', modelId: model.id }); return { success: false, error: res.error, modelId: model.id }; }
  }

  emit({ phase: 'activate', message: `Activating ${model.name}…`, modelId: model.id, modelName: model.name });
  const act = await setActiveModel(model.id);
  if (!act.success) { emit({ phase: 'error', message: act.error ?? 'Activation failed.', modelId: model.id }); return { success: false, error: act.error, modelId: model.id }; }

  emit({ phase: 'start', message: 'Starting the local model server…', modelId: model.id, modelName: model.name });
  try {
    await llm.restart();
  } catch (e) {
    emit({ phase: 'error', message: (e as Error).message, modelId: model.id });
    return { success: false, error: (e as Error).message, modelId: model.id };
  }

  emit({ phase: 'verify', message: 'Verifying…', modelId: model.id, modelName: model.name });
  const ok = !!(await pingJson(LLAMA_PORT, '/health', 3000));
  emit({
    phase: 'done',
    message: ok ? `Ready — ${model.name} is running.` : `${model.name} installed; the server is still warming up.`,
    modelId: model.id,
    modelName: model.name,
  });
  return { success: ok, modelId: model.id, modelName: model.name };
}
