"""Optional push messages to a Discord webhook or ntfy.sh topic: each user's digest (set in their
Discover settings) and the admin's failure alerts (`notify.admin_webhook` in config)."""

from __future__ import annotations

import logging

from .profile import valid_webhook
from .util import SESSION

log = logging.getLogger("collector.notify")


def _lines(new_cards, followups, max_items: int) -> list[str]:
    """new_cards: Discover feed cards (feed.card_from_row dicts)."""
    lines = []
    for r in new_cards[:max_items]:
        tag = "Intern" if r["track"] == "intern" else "New grad"
        lines.append(f"[{r['score']}] {r['company']}: {r['title']} ({r['location'] or 'n/a'}, {tag})\n{r['url']}")
    if len(new_cards) > max_items:
        lines.append(f"...and {len(new_cards) - max_items} more on your Discover page")
    if followups:
        lines.append("Follow-ups due: " + "; ".join(
            f"{f['company']} ({f['days']}d)" for f in followups[:5]))
    return lines


def _post(url: str, title: str, lines: list[str], link: str = "", tags: str = "briefcase"):
    if "discord" in url:
        content = f"**{title}**\n" + "\n".join(lines)
        if link:
            content += f"\n<{link}>"
        r = SESSION.post(url, json={"content": content[:1990]}, timeout=20, allow_redirects=False)
    else:
        headers = {"Title": title, "Tags": tags}
        if link:
            headers["Click"] = link
        r = SESSION.post(url, data="\n\n".join(lines).encode(), headers=headers, timeout=20,
                         allow_redirects=False)
    r.raise_for_status()


def send_digest(url: str, new_cards, followups, app_url: str = "", max_items: int = 8):
    if not url or (not new_cards and not followups):
        return
    if not valid_webhook(url):  # profile.py already filters these; never post anywhere else
        log.warning("digest skipped: webhook URL not allowed")
        return
    title = f"{len(new_cards)} new matches" if new_cards else "Follow-ups due"
    try:
        _post(url, f"Offerward: {title}", _lines(new_cards, followups, max_items),
              f"{app_url}/discover" if app_url else "")
    except Exception as e:  # never fail a run over a notification
        log.warning("digest failed: %s", e)


def send_admin_alert(url: str, title: str, lines: list[str]):
    """Tell the admin a run or a source failed. Same URL rules as the digest."""
    if not url:
        return
    if not valid_webhook(url):
        log.warning("admin alert skipped: notify.admin_webhook must be a Discord webhook or ntfy.sh topic")
        return
    try:
        _post(url, title, lines, tags="warning")
    except Exception as e:
        log.warning("admin alert failed: %s", e)
