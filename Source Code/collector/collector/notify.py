"""Optional push digest: Discord webhook or ntfy topic."""

from __future__ import annotations

import logging

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
    title = f"{len(new_rows)} new matches" if new_rows else "Follow-ups due"
    lines = _lines(new_rows, followups, max_items)
    try:
        if "discord.com/api/webhooks" in url or "discordapp.com/api/webhooks" in url:
            content = f"**Traction: {title}**\n" + "\n".join(lines)
            if app_url:
                content += f"\n<{app_url}/discover>"
            SESSION.post(url, json={"content": content[:1990]}, timeout=20).raise_for_status()
        elif "ntfy" in url:
            headers = {"Title": f"Traction: {title}", "Tags": "briefcase"}
            if app_url:
                headers["Click"] = f"{app_url}/discover"
            SESSION.post(url, data="\n\n".join(lines).encode(), headers=headers, timeout=20).raise_for_status()
        else:
            SESSION.post(url, json={"title": title, "text": "\n".join(lines)}, timeout=20).raise_for_status()
    except Exception as e:  # never fail a run over a notification
        log.warning("digest failed: %s", e)
