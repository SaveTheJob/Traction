# Installing the collector on Proxmox

Puts the Offerward collector in its own Debian 12 container (LXC) on a Proxmox host. It then
refreshes Discover at 6:40 and 14:40 Phoenix time. About 10 minutes, mostly waiting.

You need:
- Shell access to the Proxmox host as root (the web UI's **Shell** button works)
- The collector's service-account key on your computer at `~/.config/traction/service-account.json`
  (a dedicated `collector@traction-37` account with only the **Cloud Datastore User** role)
- A free container ID. The commands use `210`; check **Datacenter > your node** in the Proxmox UI
  and pick another number if 210 is taken.

## 1. Copy the key to the Proxmox host

On your computer (replace `PROXMOX_IP`):

```bash
scp ~/.config/traction/service-account.json root@PROXMOX_IP:/root/traction-key.json
```

## 2. Create the container and install

On the Proxmox host:

```bash
ID=210
pveam update
T=$(pveam available --section system | awk '/debian-12-standard/ {print $2}' | tail -1)
pveam download local "$T"
pct create $ID "local:vztmpl/$T" --hostname offerward-collector --memory 512 --cores 1 \
  --rootfs local-lvm:4 --net0 name=eth0,bridge=vmbr0,ip=dhcp --unprivileged 1 --features nesting=1 --onboot 1
pct start $ID && sleep 10
pct exec $ID -- bash -c "apt-get update -qq && apt-get install -y -qq curl"
pct exec $ID -- bash -c "curl -fsSL https://raw.githubusercontent.com/SaveTheJob/Traction/master/Source%20Code/collector/deploy/install-lxc.sh | bash"
```

The install script clones `master` into `/opt/traction`, creates the `traction` user, a Python
venv, `/etc/traction-collector/config.yaml` and the systemd timer.

## 3. Add the key

Still on the Proxmox host:

```bash
pct push $ID /root/traction-key.json /etc/traction-collector/service-account.json
pct exec $ID -- chown root:traction /etc/traction-collector/service-account.json
pct exec $ID -- chmod 640 /etc/traction-collector/service-account.json
rm /root/traction-key.json
```

`beta_allowlist` in the config is `[]`, which serves everyone who turns Discover on. To make
Discover invite-only, list the Firebase UIDs it should serve instead.

## 4. Check it and run once

```bash
pct exec $ID -- bash -c 'cd /opt/traction-collector && runuser -u traction -- /opt/traction-venv/bin/python -m collector selftest'
pct exec $ID -- systemctl start traction-collector.service
pct exec $ID -- journalctl -u traction-collector -n 15 --no-pager
```

The selftest should end with `All sources reachable.` The run's last log line starts with
`done:`. Your Discover page shows "Last refreshed ..." once it finishes.

## Later

| To | Run on the Proxmox host |
|---|---|
| See when it runs next | `pct exec $ID -- systemctl list-timers traction-collector.timer` |
| Read the last report | `pct exec $ID -- cat /var/lib/traction-collector/latest.md` |
| Watch a run | `pct exec $ID -- journalctl -u traction-collector -f` |
| Deploy new code from `master` | `pct exec $ID -- bash /opt/traction-collector/deploy/install-lxc.sh` (lists the incoming commits and asks first) |
| Change settings | `pct exec $ID -- nano /etc/traction-collector/config.yaml` |

The service never updates itself, its code is read-only to it, and it can only write to
`/var/lib/traction-collector`. See `../README.md` for how it works.
