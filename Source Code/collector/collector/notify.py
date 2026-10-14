"""Optional push digest: Discord webhook or ntfy.sh topic, set per user in their profile."""

from __future__ import annotations

import logging

from .profile import valid_webhook
from .util import SESSION

log = logging.getLogger("collector.notify")


def _lines(new_rows, followups, max_items: int) -> list[str]:
    lines = []
    for r in new_rows[:max_items]:
        tag = "Intern" if r["track"] == "intern" else "New grad"
        lines.append(f"[{r['score']}] {r['company']}: {r['title']} ({r['location'] or 'n/a'}, {tag})\n{r['url']}")
    if len(new_rows) > max_items:
        lines.append(f"...and {len(new_rows) - max_items} more on your Discover page")
    if followups:
        lines.append("Follow-ups due: " + "; ".join(
            f"{f['company']} ({f['days']}d)" for f in followups[:5]))
    return lines


def send_digest(url: str, new_rows, followups, app_url: str = "", max_items: int = 8):
    if not url or (not new_rows and not followups):
        return
    if not valid_webhook(url):  # profile.py already filters these; never post anywhere else
        log.warning("digest skipped: webhook URL not allowed")
        return
    title = f"{len(new_rows)} new matches" if new_rows else "Follow-ups due"
    lines = _lines(new_rows, followups, max_items)
    try:
        if "discord" in url:
            content = f"**Traction: {title}**\n" + "\n".join(lines)
            if app_url:
                content += f"\n<{app_url}/discover>"
            r = SESSION.post(url, json={"content": content[:1990]}, timeout=20, allow_redirects=False)
        else:
            headers = {"Title": f"Traction: {title}", "Tags": "briefcase"}
            if app_url:
                headers["Click"] = f"{app_url}/discover"
            r = SESSION.post(url, data="\n\n".join(lines).encode(), headers=headers, timeout=20,
                             allow_redirects=False)
        r.raise_for_status()
    except Exception as e:  # never fail a run over a notification
        log.warning("digest failed: %s", e)
