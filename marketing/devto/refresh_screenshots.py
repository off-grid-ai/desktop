#!/usr/bin/env python3
"""Refresh screenshots on the live dev.to articles: cache-bust the image URLs so
dev.to re-fetches the better re-exported versions, and move the two artifact
articles onto the new Artifacts screenshot."""
import re, json, time, urllib.request, urllib.error

API_KEY = "2JTdsDT5bt9an4Sr8jXTg5j9"
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
VER = "2"

PROJ_CAP = "Projects keep related chats, uploaded documents, and generations together."
ART_CAP = "The Artifacts tab. HTML, React, and documents the model generated, rendered in a local sandbox."
ART_SLUGS = {"local-ai-artifacts", "local-code-sandbox"}

def put(aid, body):
    data = json.dumps({"article": {"body_markdown": body}}).encode()
    req = urllib.request.Request(f"https://dev.to/api/articles/{aid}", data=data, method="PUT",
        headers={"api-key": API_KEY, "Content-Type": "application/json",
                 "Accept": "application/vnd.forem.api-v1+json", "User-Agent": UA})
    return json.load(urllib.request.urlopen(req, timeout=60))

log = json.load(open("publish-log.json"))
n = 0
for slug, meta in log.items():
    if not meta.get("id"): continue
    text = open(slug + ".md").read()
    if "marketing-assets/screenshots/" not in text:
        continue
    if slug in ART_SLUGS:
        text = text.replace("screenshots/projects.png", "screenshots/artifacts.png")
        text = text.replace(PROJ_CAP, ART_CAP)
    # cache-bust every screenshot URL to ?v=VER
    text = re.sub(r"(marketing-assets/screenshots/[a-z0-9-]+\.png)(\?v=\d+)?", rf"\g<1>?v={VER}", text)
    open(slug + ".md", "w").write(text)
    for attempt in range(4):
        try:
            put(meta["id"], text)
            print(f"REFRESHED  {slug}")
            n += 1; time.sleep(3); break
        except urllib.error.HTTPError as e:
            if e.code == 429:
                w = 30 * (attempt + 1); print(f"  429 {slug}; sleep {w}s"); time.sleep(w); continue
            print(f"  FAIL {slug}: {e.code} {e.read().decode()[:140]}"); break
        except Exception as e:
            print(f"  ERR {slug}: {str(e)[:120]}"); time.sleep(8)
print(f"\n{n} articles refreshed (cache-bust v{VER}).")
