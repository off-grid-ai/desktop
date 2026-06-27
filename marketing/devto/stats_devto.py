#!/usr/bin/env python3
"""Off Grid AI Desktop - dev.to analytics.

Pulls live views / reactions / comments for the 40 articles we published
(tracked in publish-log.json), grouped into Desktop core, Image + GGUF, and
Gateway. Run it any time:  python3 stats_devto.py

Author page-view counts come from GET /api/articles/me (authenticated)."""
import json, os, urllib.request, urllib.error

API_KEY = "2JTdsDT5bt9an4Sr8jXTg5j9"
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"

# slug -> group
GROUP = {}
def g(name, slugs):
    for s in slugs: GROUP[s] = name

g("Image + GGUF", [
  "how-to-generate-ai-images-locally-mac","how-to-generate-ai-images-locally-windows",
  "how-to-run-stable-diffusion-desktop","local-ai-image-studio","best-gguf-image-models-local",
  "how-to-run-juggernaut-xl-locally","how-to-run-realvisxl-locally","how-to-run-realvisxl-lightning-locally",
  "how-to-run-pony-diffusion-locally","how-to-run-animagine-xl-locally",
  "how-to-run-dreamshaper-xl-turbo-locally","how-to-run-illustrious-xl-locally"])
g("Gateway", [
  "local-openai-compatible-api","point-your-ide-at-local-ai",
  "one-local-api-all-modalities","local-ai-models-as-mcp-tools"])
# everything else -> Desktop core (assigned after we know the slugs)

def fetch_all():
    """All of the authenticated user's published articles (paginated)."""
    out, page = [], 1
    while True:
        url = f"https://dev.to/api/articles/me/published?per_page=100&page={page}"
        req = urllib.request.Request(url, headers={
            "api-key": API_KEY, "Accept": "application/vnd.forem.api-v1+json", "User-Agent": UA})
        batch = json.load(urllib.request.urlopen(req, timeout=60))
        if not batch: break
        out += batch; page += 1
        if len(batch) < 100: break
    return out

def main():
    log = json.load(open("publish-log.json"))
    ours_ids = {v["id"] for v in log.values() if v.get("id")}
    slug_by_id = {v["id"]: s for s, v in log.items() if v.get("id")}
    arts = {a["id"]: a for a in fetch_all() if a["id"] in ours_ids}

    rows = []
    for aid, a in arts.items():
        slug = slug_by_id.get(aid, "")
        rows.append({
            "group": GROUP.get(slug, "Desktop core"),
            "title": a["title"],
            "views": a.get("page_views_count", 0),
            "reactions": a.get("public_reactions_count", 0),
            "comments": a.get("comments_count", 0),
            "url": a["url"],
        })

    order = ["Desktop core", "Image + GGUF", "Gateway"]
    tv = tr = tc = 0
    for grp in order:
        g_rows = sorted([r for r in rows if r["group"] == grp], key=lambda r: -r["views"])
        if not g_rows: continue
        gv = sum(r["views"] for r in g_rows); gr = sum(r["reactions"] for r in g_rows); gc = sum(r["comments"] for r in g_rows)
        tv += gv; tr += gr; tc += gc
        print(f"\n=== {grp}  ({len(g_rows)} articles)  -  {gv} views | {gr} reactions | {gc} comments ===")
        print(f"{'VIEWS':>6} {'RXN':>4} {'CMT':>4}  TITLE")
        for r in g_rows:
            print(f"{r['views']:>6} {r['reactions']:>4} {r['comments']:>4}  {r['title'][:72]}")

    # Leaderboard: everything ranked by attention (views, then reactions, then comments).
    GTAG = {"Desktop core": "CORE", "Image + GGUF": "IMG", "Gateway": "GW"}
    ranked = sorted(rows, key=lambda r: (-r["views"], -r["reactions"], -r["comments"]))
    movers = [r for r in ranked if r["views"] or r["reactions"] or r["comments"]]
    print(f"\n{'='*60}")
    print("LEADERBOARD - what is getting attention (views, then reactions)")
    if not movers:
        print("  nothing has registered views/reactions yet (give it time to index).")
    for i, r in enumerate(movers, 1):
        print(f"{i:>2}. {r['views']:>5}v {r['reactions']:>2}r {r['comments']:>2}c  [{GTAG[r['group']]:>4}]  {r['title'][:60]}")
        print(f"      {r['url']}")
    silent = len(rows) - len(movers)
    if silent:
        print(f"  ...and {silent} more with no views/reactions yet.")

    print(f"\n{'='*60}")
    print(f"TOTAL across {len(rows)} Off Grid AI Desktop articles:")
    print(f"  {tv} views | {tr} reactions | {tc} comments")
    missing = len(ours_ids) - len(arts)
    if missing:
        print(f"  note: {missing} published article(s) not returned by the API "
              f"(may still be indexing, or under review).")

if __name__ == "__main__":
    main()
