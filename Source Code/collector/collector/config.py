"""Config loading with defaults. See config.example.yaml for every option."""

from __future__ import annotations

import os
from copy import deepcopy
from pathlib import Path

import yaml

DEFAULTS = {
    "traction": {
        "user_id": "",
        "service_account": "/etc/traction-collector/service-account.json",
        "app_url": "",
    },
    "settings": {
        "db_path": "/var/lib/traction-collector/state.db",
        "report_dir": "/var/lib/traction-collector",
        "min_score": 60,
        "notify_min_score": 70,
        "max_new_per_run": 600,
        "followup_days": 7,
        "workday_queries": ["intern", "new grad", "university graduate", "early career"],
        "screen": {
            "enabled": True,
            "min_prescore": 45,
            "max_per_run": 200,
            "workers": 6,
            "recheck_days": 14,
        },
    },
    "notify": {"webhook": ""},
    "sources": [],
    "watchlist": [],
    "profile": {},
}


def _merge(base: dict, over: dict) -> dict:
    out = deepcopy(base)
    for k, v in (over or {}).items():
        if isinstance(v, dict) and isinstance(out.get(k), dict):
            out[k] = _merge(out[k], v)
        else:
            out[k] = v
    return out


def load(path: str | None) -> dict:
    path = path or os.environ.get("TRACTION_COLLECTOR_CONFIG") or "/etc/traction-collector/config.yaml"
    p = Path(path)
    if not p.exists():
        raise SystemExit(f"Config not found: {p}. Copy config.example.yaml there and edit it.")
    with p.open() as f:
        cfg = _merge(DEFAULTS, yaml.safe_load(f) or {})
    # Environment overrides, handy for secrets
    if os.environ.get("TRACTION_USER_ID"):
        cfg["traction"]["user_id"] = os.environ["TRACTION_USER_ID"]
    if os.environ.get("TRACTION_SERVICE_ACCOUNT"):
        cfg["traction"]["service_account"] = os.environ["TRACTION_SERVICE_ACCOUNT"]
    if os.environ.get("TRACTION_WEBHOOK"):
        cfg["notify"]["webhook"] = os.environ["TRACTION_WEBHOOK"]
    if not cfg["profile"]:
        raise SystemExit("Config has no 'profile' section; see config.example.yaml.")
    return cfg
