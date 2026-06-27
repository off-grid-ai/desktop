#!/usr/bin/env python3
"""Embed product screenshots into the articles and push updates to dev.to.
Idempotent: skips any article that already contains a screenshots/ URL."""
import os, re, json, time, urllib.request, urllib.error

API_KEY = "2JTdsDT5bt9an4Sr8jXTg5j9"
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
BASE = "https://raw.githubusercontent.com/off-grid-ai/desktop/marketing-assets/screenshots/{name}.png"

CAP = {
 "chat": "The Off Grid AI Desktop chat, running a local model fully on-device.",
 "models": "The built-in model browser. Download text, vision, image, and voice models from Hugging Face, sized to your machine.",
 "projects": "Projects keep related chats, uploaded documents, and generations together.",
 "integrations": "Connectors in Off Grid AI Desktop. Authorized actions run only after you approve them.",
 "gateway": "The local gateway: one OpenAI-compatible API at 127.0.0.1:7878 for every modality.",
 "onboarding": "Off Grid AI Desktop. Private AI that runs on your machine, no cloud, no account.",
 "meetings": "Meetings record and transcribe on-device, with a local summary and transcript.",
 "day": "Day lays out your meetings, suggested actions, and to-dos in one place.",
 "reflect": "Reflect shows where your attention actually went across the day.",
 "replay": "Replay is a scrubbable movie of your day, captured on-device.",
 "entities": "Entities: a private CRM for the people, projects, and topics in your work.",
 "search": "Search across everything Off Grid AI Desktop has captured, locally.",
 "actions": "Actions: what to do, and what Off Grid proposes. Always your call.",
}

IMG_SLUGS = {  # image-gen articles: chat.png shows on-device image models in use
 "how-to-generate-ai-images-locally-mac","how-to-generate-ai-images-locally-windows",
 "how-to-run-stable-diffusion-desktop","local-ai-image-studio","best-gguf-image-models-local",
 "how-to-run-juggernaut-xl-locally","how-to-run-realvisxl-locally","how-to-run-realvisxl-lightning-locally",
 "how-to-run-pony-diffusion-locally","how-to-run-animagine-xl-locally",
 "how-to-run-dreamshaper-xl-turbo-locally","how-to-run-illustrious-xl-locally"}

ART = {
 "how-to-run-llms-locally-mac": ["chat","models"],
 "how-to-run-llms-locally-windows": ["chat","models"],
 "how-to-run-local-ai-mac": ["chat","models"],
 "how-to-run-local-ai-windows": ["chat","models"],
 "how-to-run-gemma-locally": ["models","chat"],
 "how-to-run-qwen-locally": ["models","chat"],
 "ollama-alternative-local": ["chat","models"],
 "lm-studio-alternative": ["chat","models"],
 "local-chatgpt-alternative": ["chat"],
 "how-to-generate-ai-images-locally-mac": ["chat","models"],
 "how-to-generate-ai-images-locally-windows": ["chat","models"],
 "how-to-run-stable-diffusion-desktop": ["chat","models"],
 "local-ai-image-studio": ["chat","projects"],
 "best-gguf-image-models-local": ["models","chat"],
 "how-to-run-juggernaut-xl-locally": ["chat","models"],
 "how-to-run-realvisxl-locally": ["chat","models"],
 "how-to-run-realvisxl-lightning-locally": ["chat","models"],
 "how-to-run-pony-diffusion-locally": ["chat","models"],
 "how-to-run-animagine-xl-locally": ["chat","models"],
 "how-to-run-dreamshaper-xl-turbo-locally": ["chat","models"],
 "how-to-run-illustrious-xl-locally": ["chat","models"],
 "local-openai-compatible-api": ["gateway"],
 "point-your-ide-at-local-ai": ["gateway"],
 "one-local-api-all-modalities": ["gateway"],
 "local-ai-models-as-mcp-tools": ["gateway"],
 "connect-notion-linear-jira-local-ai": ["integrations","actions"],
 "local-ai-connector-support": ["integrations","actions"],
 "voice-to-text-locally": ["chat","models"],
 "text-to-speech-locally": ["chat","models"],
 "all-in-one-local-voice-ai": ["chat","models"],
 "transcribe-meetings-locally": ["meetings"],
 "private-ai-meeting-notetaker": ["meetings"],
 "chat-with-documents-locally": ["projects","chat"],
 "local-ai-second-brain": ["day","reflect","replay","entities"],
 "local-ai-skills-automation": ["chat","actions"],
 "local-ai-artifacts": ["projects","chat"],
 "local-code-sandbox": ["projects","chat"],
 "only-local-multimodal-ai": ["onboarding","chat"],
 "fully-open-source-private-ai": ["onboarding","integrations"],
 "fast-local-ai-text-and-images": ["chat","models"],
}

IMG_CAP_OVERRIDE = "On-device image generation in Off Grid AI Desktop. SDXL, Lightning, Turbo, and more, run from your chat."

def caption(slug, name):
    if name == "chat" and slug in IMG_SLUGS:
        return IMG_CAP_OVERRIDE
    return CAP[name]

def block(slug, names):
    out = []
    for n in names:
        url = BASE.format(name=n)
        out.append(f"![{caption(slug,n)}]({url})\n\n*{caption(slug,n)}*\n")
    return "\n".join(out)

def insert(text, slug, names):
    primary = block(slug, names[:1])
    rest = block(slug, names[1:]) if len(names) > 1 else ""
    i = text.find("\n## ")
    if i == -1:  # fallback: after first paragraph
        i = text.find("\n\n", text.find("\n---\n") + 5)
    text = text[:i] + "\n\n" + primary + text[i:]
    if rest:
        j = text.rfind("\n## ")
        text = text[:j] + "\n\n" + rest + text[j:]
    return text

def put(article_id, body_markdown):
    data = json.dumps({"article": {"body_markdown": body_markdown}}).encode()
    req = urllib.request.Request(f"https://dev.to/api/articles/{article_id}", data=data, method="PUT",
        headers={"api-key": API_KEY, "Content-Type": "application/json",
                 "Accept": "application/vnd.forem.api-v1+json", "User-Agent": UA})
    return json.load(urllib.request.urlopen(req, timeout=60))

log = json.load(open("publish-log.json"))
done = 0
for slug, names in ART.items():
    meta = log.get(slug)
    if not meta or not meta.get("id"):
        print(f"  no id, skip  {slug}"); continue
    text = open(slug + ".md").read()
    if "marketing-assets/screenshots/" in text:
        print(f"  already has shots  {slug}"); done += 1; continue
    text = insert(text, slug, names)
    open(slug + ".md", "w").write(text)
    for attempt in range(4):
        try:
            put(meta["id"], text)
            print(f"UPDATED  {slug}  (+{len(names)} shot{'s' if len(names)>1 else ''})")
            done += 1; time.sleep(3); break
        except urllib.error.HTTPError as e:
            if e.code == 429:
                w = 30*(attempt+1); print(f"  429 on {slug}; sleep {w}s"); time.sleep(w); continue
            print(f"  FAIL {slug}: {e.code} {e.read().decode()[:160]}"); break
        except Exception as e:
            print(f"  ERR {slug}: {str(e)[:140]}"); time.sleep(8)
print(f"\n{done}/{len(ART)} articles have screenshots embedded.")
