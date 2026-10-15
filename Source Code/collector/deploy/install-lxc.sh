#!/usr/bin/env bash
# Install the Offerward collector inside a Debian 12 LXC (or any systemd Debian/Ubuntu box).
# Run as root inside the container:
#   bash install-lxc.sh
# Re-running is safe: it updates the code, venv and units, and never overwrites config.
# This is also the only way the code gets updated; the service never pulls on its own.
set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/SaveTheJob/Traction.git}"
BRANCH="${BRANCH:-master}"
APP_DIR=/opt/traction
LINK=/opt/traction-collector              # space-free path to "Source Code/collector"
VENV=/opt/traction-venv
ETC=/etc/traction-collector
STATE=/var/lib/traction-collector

if [[ $EUID -ne 0 ]]; then echo "Run as root." >&2; exit 1; fi

echo "==> Packages"
apt-get update -qq
DEBIAN_FRONTEND=noninteractive apt-get install -y -qq --no-install-recommends \
  git python3 python3-venv ca-certificates tzdata >/dev/null

echo "==> Service user"
id traction >/dev/null 2>&1 || useradd --system --home "$STATE" --shell /usr/sbin/nologin traction

echo "==> Code"
if [[ -d "$APP_DIR/.git" ]]; then
  # Older installs gave the service user ownership of the code; take it back.
  chown -R root:root "$APP_DIR"
  git -C "$APP_DIR" fetch -q origin "$BRANCH"
  git -C "$APP_DIR" checkout -q "$BRANCH"
  incoming=$(git -C "$APP_DIR" log --oneline "HEAD..origin/$BRANCH")
  if [[ -n "$incoming" ]]; then
    echo "    incoming commits:"
    sed 's/^/      /' <<<"$incoming"
    if [[ -t 0 ]]; then
      read -r -p "    Deploy these? [y/N] " ok
      [[ "$ok" == [yY]* ]] || { echo "Aborted; code left unchanged."; exit 1; }
    fi
    git -C "$APP_DIR" merge -q --ff-only "origin/$BRANCH"
  else
    echo "    already up to date"
  fi
else
  git clone -q --depth 50 --branch "$BRANCH" "$REPO_URL" "$APP_DIR"
fi
# Code stays root-owned so the service (which holds the Firebase key) can't modify it.
chown -R root:root "$APP_DIR"
echo "    deployed $(git -C "$APP_DIR" log -1 --format='%h %s')"
ln -sfn "$APP_DIR/Source Code/collector" "$LINK"

echo "==> Python venv"
[[ -d "$VENV" ]] || python3 -m venv "$VENV"
"$VENV/bin/pip" install -q --upgrade pip
"$VENV/bin/pip" install -q -r "$LINK/requirements.txt"

echo "==> Config and state"
install -d -m 750 -o root -g traction "$ETC"
install -d -m 750 -o traction -g traction "$STATE"
if [[ ! -f "$ETC/config.yaml" ]]; then
  install -m 640 -o root -g traction "$LINK/config.example.yaml" "$ETC/config.yaml"
  echo "    created $ETC/config.yaml (set traction.beta_allowlist to limit who is served)"
fi

echo "==> systemd units"
install -m 644 "$LINK/deploy/traction-collector.service" /etc/systemd/system/
install -m 644 "$LINK/deploy/traction-collector.timer" /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now traction-collector.timer

cat <<EOF

Installed. Next:
  1. Put a service-account key at $ETC/service-account.json (use a dedicated
     account with only the "Cloud Datastore User" role; see README)
       chown root:traction $ETC/service-account.json && chmod 640 $ETC/service-account.json
  2. Optionally limit who is served: traction.beta_allowlist in $ETC/config.yaml
     (Firebase Auth UIDs; empty serves everyone with Discover turned on)
  3. Check every source is reachable from this box:
       cd $LINK && runuser -u traction -- $VENV/bin/python -m collector --config $ETC/config.yaml selftest
  4. First real run (takes a few minutes while it reads job descriptions):
       systemctl start traction-collector.service && journalctl -u traction-collector -f
  Schedule: systemctl list-timers traction-collector.timer
  Report:   $STATE/latest.md
  Update:   bash $LINK/deploy/install-lxc.sh   (shows incoming commits, asks before deploying)
EOF
