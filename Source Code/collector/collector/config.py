"""Config loading with defaults. See config.example.yaml for every option."""

from __future__ import annotations

import os
from copy import deepcopy
from pathlib import Path

import yaml

DEFAULTS = {
    "traction": {
        "service_account": "/etc/traction-collector/service-account.json",
        "app_url": "https://traction-37.web.app",
        "beta_allowlist": [],
    },
    "settings": {
        "db_path": "/var/lib/traction-collector/state.db",
        "report_dir": "/var/lib/traction-collector",
        "write_warn": 10000,
        "followup_days": 7,
        "workday_queries": ["intern", "new grad", "university graduate", "early career"],
        "screen": {
            "enabled": True,
            "min_prescore": 45,
            "max_per_run": 200,
            "workers": 6,
            "recheck_days": 14,
        },
        "feeds": {
            "max_per_user": 20,
            "max_requests_per_run": 5,
            "max_seconds": 180,
        },
    },
    "notify": {"admin_webhook": ""},
    "sources": [],
    "watchlist": [],
    "role_families": {},
    "avoid": [],
    "companies": {"cap_exempt": [], "defense": []},
}

TIERS = ("core", "strong", "ok")


def _merge(base: dict, over: dict) -> dict:
    out = deepcopy(base)
    for k, v in (over or {}).items():
        if isinstance(v, dict) and isinstance(out.get(k), dict):
            out[k] = _merge(out[k], v)
        else:
            out[k] = v
    return out


def resolve_families(raw: dict) -> dict[str, dict]:
    """Expand "@id" references (another family's core list) and normalize each family to
    {label, core, strong, ok, categories: {core, strong, ok}}."""
    fams: dict[str, dict] = {}
    for fid, f in (raw or {}).items():
        f = f or {}
        cats = f.get("categories") or {}
        fams[str(fid)] = {
            "label": str(f.get("label") or fid),
            **{t: [str(x) for x in (f.get(t) or [])] for t in TIERS},
            "categories": {t: [str(x).lower() for x in (cats.get(t) or [])] for t in TIERS},
        }
    for fid, f in fams.items():
        for t in TIERS:
            out: list[str] = []
            for term in f[t]:
                if term.startswith("@"):
                    ref = term[1:]
                    if ref not in fams:
                        raise SystemExit(f"role_families.{fid}.{t}: unknown family reference '{term}'")
                    out += [x for x in fams[ref]["core"] if not x.startswith("@")]
                else:
                    out.append(term)
            f[t + "_resolved"] = list(dict.fromkeys(out))
    for f in fams.values():
        for t in TIERS:
            f[t] = f.pop(t + "_resolved")
    return fams


def load(path: str | None) -> dict:
    path = path or os.environ.get("TRACTION_COLLECTOR_CONFIG") or "/etc/traction-collector/config.yaml"
    p = Path(path)
    if not p.exists():
        raise SystemExit(f"Config not found: {p}. Copy config.example.yaml there and edit it.")
    with p.open() as f:
        raw = yaml.safe_load(f) or {}
    if "profile" in raw:
        raise SystemExit(
            "Config still has a single-user 'profile' section. Profiles now live in Firestore: "
            "move it to its own file and run `import-profile` (see profiles/example-embedded-intern.yaml).")
    cfg = _merge(DEFAULTS, raw)
    # Environment overrides, handy for secrets and containers
    if os.environ.get("TRACTION_SERVICE_ACCOUNT"):
        cfg["traction"]["service_account"] = os.environ["TRACTION_SERVICE_ACCOUNT"]
    cfg["role_families"] = resolve_families(cfg["role_families"])
    if not cfg["role_families"]:
        raise SystemExit("Config has no 'role_families'; see config.example.yaml.")
    cfg["traction"]["beta_allowlist"] = [str(u) for u in cfg["traction"].get("beta_allowlist") or []]
    return cfg
