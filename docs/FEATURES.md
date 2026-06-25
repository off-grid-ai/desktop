# Off Grid AI — Features

A deep dive on everything the free, open-source app does. All of it runs **on your
device** — no cloud inference, no account, no API key.

- [The Gateway (local OpenAI-compatible API)](#the-gateway)
- [Chat](#chat)
- [Image generation](#image-generation)
- [Voice & speech](#voice--speech)
- [Projects (RAG)](#projects-rag)
- [Artifacts](#artifacts)
- [Connectors (MCP)](#connectors-mcp)
- [Models](#models)
- [Privacy & data](#privacy--data)
- [Architecture (open core)](#architecture-open-core)
- [Off Grid Pro (coming July 2026)](#off-grid-pro--coming-july-2026)
- [Build & develop](#build--develop)

---

## The Gateway

One local server — `http://127.0.0.1:7878` — exposes the **OpenAI API** for every model
you've downloaded. Point any OpenAI SDK at `…/v1` with any (ignored) key.

| Capability | Method · Endpoint | Notes |
|---|---|---|
| Chat (text) | `POST /v1/chat/completions` | streaming via `stream:true` |
| Vision | `POST /v1/chat/completions` | `image_url` content parts (data URL or http) |
| Text → Image | `POST /v1/images` · `/v1/images/generations` | `{prompt, aspect_ratio?, resolution?, seed?}` |
| Image → Image | `POST /v1/images` · `/v1/images/edits` | `input_references:[{image_url:{url}}]` |
| Speech → Text | `POST /v1/audio/transcriptions` | multipart `file` (whisper) |
| Text → Speech | `POST /v1/audio/speech` | `{input, voice?}` → `audio/wav` (Kokoro) |
| Embeddings | `POST /v1/embeddings` | local `all-MiniLM-L6-v2`, 384-dim |
| Models | `GET /v1/models` | the active model per modality |

- **Interactive docs**: `GET /docs` (Scalar) · **spec**: `GET /openapi.json`.
- **Load-on-demand**: models load when a request needs them and offload after — long
  requests return a `request_id` you can poll, so one machine serves every modality without
  cramming them all into RAM at once.
- **Headless**: run only the gateway (no UI/capture) with `OFFGRID_SERVER_ONLY=1` or
  `--server-only` — ideal for deploying the gateway on its own box.

```bash
# chat
curl http://127.0.0.1:7878/v1/chat/completions -H 'Content-Type: application/json' \
  -d '{"model":"local","messages":[{"role":"user","content":"Explain RAG in one line."}]}'
# image
curl http://127.0.0.1:7878/v1/images -H 'Content-Type: application/json' \
  -d '{"prompt":"a foggy mountain cabin at dawn","aspect_ratio":"16:9"}' --output out.png
```

## Chat

- **Text + vision** with the active LLM; drop in images for multimodal prompts.
- **Thinking mode** — toggle the model's reasoning on/off per chat.
- **Streaming** responses with live token + reasoning display.
- **Tabs** — multiple conversations open at once; **search** your history.
- **Per-message actions** — copy, regenerate, edit-and-fork.
- **Attachments** — add files/images; chips stay clickable and are catalogued.
- **Voice mode** — exchange messages as voice notes (record + auto-play replies).
- **Tools** — built-in web tools (search, read URL, calculator, date/time); connector tools
  when Connectors is on.
- **Scope** — chat plainly ("Off Grid AI") or scoped to a **project** (grounded in its docs).

## Image generation

- **Text → image** and **image → image** via `stable-diffusion.cpp` (Metal-accelerated).
- Works with **SDXL finetunes as GGUF** (RealVis, Juggernaut, DreamShaper, …) and other
  checkpoints — pick the active image model in **Models**.
- Curated **styles** with on-device preview thumbnails; **LoRA** support.
- Tune resolution, steps, seed; live progress with previews. Outputs saved to the gallery
  (scoped to the chat/project) and openable from chat.

## Voice & speech

- **Speech → text** with `whisper.cpp` (tiny → large-v3-turbo).
- **Text → speech** with Kokoro (multiple voices) — tap **Speak** on any message.
- **Voice mode** turns chat into a hands-free, voice-note conversation.

## Projects (RAG)

- Group related chats; give a project **instructions** (a system prompt prepended to every
  chat in it).
- **Knowledge base** — upload documents (txt, md, **PDF**, DOCX), images, audio, or video.
  Audio is transcribed; video frames are read by the vision model. Everything is chunked +
  embedded locally (LanceDB) and retrieved when you chat in the project.
- **Your chats**, **Files**, and **Artifacts** for the project are all in one place.
- Retrieval in the free build spans your **uploaded documents** (captured-memory retrieval is
  a Pro feature).

## Artifacts

Generate and preview rich outputs in a sandboxed canvas:

- **HTML**, **React** (JSX/TSX, npm packages loaded from a keyless CDN), **SVG**,
  **Mermaid** diagrams, and **Markdown documents**.
- Open from a chat as a chip, view **code** or **preview**, resize the canvas.
- Artifacts are **saved and scoped** — see a chat's artifacts in that chat, and all of a
  project's artifacts on the project. The gallery has **Images** and **Artifacts** tabs.

## Connectors (MCP)

Use [Model Context Protocol](https://modelcontextprotocol.io) servers right inside chat.

- **Add your own** via three auth modes: **none**, **token** (stored in the OS keychain via
  `safeStorage`), or **OAuth** (browser flow).
- **Preset catalogue** — one-tap setup for common servers.
- **In chat** — turn **Connectors** on in the composer; the model can call connector tools,
  reads run inline.
- Transports: hosted **HTTP** and local **stdio** servers.

## Models

- **Catalog** with curated, **size-bucketed** recommendations (≤2/4/6/8/16 GB) per modality
  (text, vision, image, voice, transcription) — compete-with-LM-Studio picks, with release
  dates and credibility tiers (official / verified / community / Off Grid).
- **Direct Hugging Face search**, scoped to the focused modality; auto-detects GGUF / GGML /
  ONNX variants.
- **Download manager** — progress, cancel, and a per-modality **active model** that the
  gateway loads on demand.
- Off Grid publishes correctly-converted SDXL GGUFs under the
  [`offgrid-ai`](https://huggingface.co/offgrid-ai) org.

## Privacy & data

- **100% local inference.** Your conversations, documents, and models never leave the device.
- **Encryption at rest** — new databases are encrypted (SQLCipher via
  `better-sqlite3-multiple-ciphers`), with the key held by the OS keychain.
- **No account, no API key**, and it works fully **offline**.

## Architecture (open core)

This repo is the **open, AGPL-3.0 core** — the model runner, gateway, chat, projects,
artifacts, connectors, and catalog. Pro features live in a separate **private** package
loaded as a git submodule. The core **never imports pro**: pro registers itself through small
registries (an `activate()` pattern) and is simply absent here, so the open app builds and
runs entirely on its own. A build-time flag (`__OFFGRID_PRO__`) decides whether pro is
present, and `OFFGRID_PRO=0` simulates the free tier locally.

## Off Grid Pro — coming July 2026

The free app **runs** models. **Pro** adds the always-on layer that **sees, remembers, and
acts**, on-device:

- **Never forgets** — remembers everything you see and do.
- **Unified search** across captured activity, meetings, and connectors.
- **Private CRM** — auto-built people/project/company records with cross-source summaries.
- **Day · Reflect · Replay** — your day planned, where time goes, rewind your screen.
- **Meetings** — local recording + transcription.
- **Proactive secretary** — surfaces what matters, drafts actions (approval-gated).
- **Skills automation** — trigger → action (schedule / keyword / event).

→ [Join early access](https://getoffgridai.co/early-access/) (free) · or
[pay now](https://getoffgridai.co/pay) for lifetime free + first access.

## Build & develop

```bash
git clone https://github.com/off-grid-ai/desktop.git
cd desktop && npm install
npm run dev          # full app
npm run gateway      # headless gateway only (:7878)
npm run build:mac    # signed + notarized macOS app
npm run build:win    # Windows installer
```

Verify types before a PR: `npm run typecheck` (main + renderer). Main-process changes need an
app restart; renderer changes hot-reload.
