# FF Mission Hospital — Infrastructure & Failover Guide

> **For IT/DevOps and Hospital Administration**
> This document covers the hardware, PostgreSQL replication, network, and manual downtime procedures required for the four-layer failover architecture.

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  HOSPITAL LAN (Primary Operations Zone)                                      │
│                                                                               │
│  ┌─────────────────────┐   Streaming    ┌─────────────────────────────────┐  │
│  │ PRIMARY LOCAL SERVER│  Replication   │ SECONDARY LOCAL STANDBY SERVER  │  │
│  │  PostgreSQL :5432   │──────────────►│  PostgreSQL :5432 (standby)     │  │
│  │  All clinical data  │               │  Hot warm standby, auto-promote  │  │
│  │  WRITE primary      │               │  WRITE if primary fails          │  │
│  └─────────┬───────────┘               └─────────────────────────────────┘  │
│             │                                                                 │
│             │ CDC Triggers → sync_queue (every 5s)                           │
│             ▼                                                                 │
│  ┌──────────────────────────────────┐                                        │
│  │  Node.js API (port 3000)         │                                        │
│  │  Health Monitor (every 10s)      │                                        │
│  │  Sync Service (every 5s)         │                                        │
│  └──────────────────────────────────┘                                        │
│             │                                                                 │
└─────────────┼────────────────────────────────────────────────────────────────┘
              │ Internet (sync / cloud fallback)
              ▼
┌─────────────────────────────────┐
│  NEON CLOUD PostgreSQL          │
│  ff_mission_hospital_cloud      │
│  Cloud fallback + offsite backup│
└─────────────────────────────────┘

DEVICE LAYER (Layer 4 — last resort)
  Mobile App offline storage → sync on reconnect
  Biometric/RFID device internal log → push on reconnect
  Manual paper register → supervisor-verified entry
```

---

## Failover Sequence

| Priority | Layer | Trigger | Expected Downtime |
|----------|-------|---------|-------------------|
| 1 | Primary local (:5432) | Default | 0 |
| 2 | Standby local (:5432) | Primary unreachable for 20s | < 30 seconds |
| 3 | Neon Cloud | Both local servers down | < 60 seconds |
| 4 | Device offline / Manual | No internet | Immediate, sync later |

---

## 1. Hardware Requirements

### Primary Server (Server Room)

| Component | Specification |
|-----------|---------------|
| CPU | Intel Core i7 / Xeon E-2300 (4+ cores) |
| RAM | 16 GB DDR4 minimum (32 GB recommended) |
| Storage | 512 GB SSD (OS) + 2 TB HDD (data, RAID-1) |
| OS | Ubuntu Server 22.04 LTS |
| PostgreSQL | 16.x |
| NIC | 1 Gbps LAN |
| Power | UPS (1500VA minimum, 30-min backup) |

### Secondary Standby Server

| Component | Specification |
|-----------|---------------|
| CPU | Intel Core i5 / i7 (4 cores) |
| RAM | 16 GB DDR4 |
| Storage | 512 GB SSD + 1 TB HDD |
| OS | Ubuntu Server 22.04 LTS |
| PostgreSQL | 16.x (same version as primary) |
| NIC | 1 Gbps LAN |
| Power | UPS (1000VA, 20-min backup) |

---

## 2. PostgreSQL Streaming Replication Setup

### Step 1 — Primary Server Configuration

Edit `/etc/postgresql/16/main/postgresql.conf`:

```ini
# Replication
wal_level = replica
max_wal_senders = 5
wal_keep_size = 256MB
synchronous_commit = on

# Performance
shared_buffers = 4GB          # ~25% of RAM
work_mem = 64MB
maintenance_work_mem = 512MB
effective_cache_size = 12GB
checkpoint_completion_target = 0.9
```

Edit `/etc/postgresql/16/main/pg_hba.conf` — add the standby server IP:

```
# Replication connections from standby
host    replication     replicator      <STANDBY_IP>/32     scram-sha-256
```

Create the replication user:

```sql
CREATE ROLE replicator WITH REPLICATION LOGIN PASSWORD 'strong-replication-password';
```

Reload: `sudo systemctl reload postgresql@16-main`

### Step 2 — Take Initial Base Backup on Standby Server

On the **standby server**, stop PostgreSQL and replace the data directory:

```bash
sudo systemctl stop postgresql@16-main
sudo -u postgres rm -rf /var/lib/postgresql/16/main
sudo -u postgres pg_basebackup \
  -h <PRIMARY_IP> \
  -U replicator \
  -D /var/lib/postgresql/16/main \
  -P -R -Xs -C -S standby_slot
```

The `-R` flag automatically creates `standby.signal` and writes connection info to `postgresql.auto.conf`.

### Step 3 — Standby Server Configuration

Edit `/etc/postgresql/16/main/postgresql.conf` on standby:

```ini
# Standby settings
hot_standby = on
hot_standby_feedback = on
primary_conninfo = 'host=<PRIMARY_IP> port=5432 user=replicator password=strong-replication-password'
primary_slot_name = 'standby_slot'

# Performance
shared_buffers = 4GB
work_mem = 64MB
```

Start the standby: `sudo systemctl start postgresql@16-main`

Verify on primary:
```sql
SELECT client_addr, state, sent_lsn, write_lsn, flush_lsn, replay_lsn
FROM pg_stat_replication;
```

### Step 4 — Manual Failover (Promote Standby)

If the primary is permanently down:

```bash
# On the STANDBY server:
sudo -u postgres pg_ctl promote -D /var/lib/postgresql/16/main
# Or:
sudo -u postgres psql -c "SELECT pg_promote();"
```

After promotion, update the `.env` on the API server:
```
DATABASE_URL="postgresql://mac@<STANDBY_IP>:5432/ff_mission_hospital?schema=public"
```

Then restart the API server: `pm2 restart ff-hospital-api`

---

## 3. Automatic Failover with Patroni (Recommended for Production)

For zero-touch automatic failover, deploy **Patroni** (battle-tested HA solution for PostgreSQL):

```bash
# Install on both servers
pip install patroni[etcd]

# Install etcd (distributed config store)
sudo apt install etcd
```

Sample `patroni.yml`:

```yaml
scope: ff-mission-hospital
namespace: /db/
name: primary-node

restapi:
  listen: 0.0.0.0:8008
  connect_address: <THIS_SERVER_IP>:8008

etcd:
  host: <ETCD_IP>:2379

bootstrap:
  dcs:
    ttl: 30
    loop_wait: 10
    retry_timeout: 30
    maximum_lag_on_failover: 1048576
  initdb:
    - encoding: UTF8
    - locale: en_US.UTF-8

postgresql:
  listen: 0.0.0.0:5432
  connect_address: <THIS_SERVER_IP>:5432
  data_dir: /var/lib/postgresql/16/main
  authentication:
    replication:
      username: replicator
      password: strong-replication-password
    superuser:
      username: postgres
      password: strong-postgres-password
```

Patroni automatically promotes the standby within **~30 seconds** of primary failure.

---

## 4. Network Topology

```
Server Room
├── Primary Server (192.168.1.10)  ─ PostgreSQL :5432
├── Standby Server (192.168.1.11) ─ PostgreSQL :5432 (hot standby)
├── API Server     (192.168.1.12) ─ Node.js :3000
├── Network Switch (managed, VLAN-capable)
└── UPS Unit (feeds all server room equipment)

Hospital LAN
├── Nursing Stations (192.168.1.20–50)
├── Pharmacy (192.168.1.60)
├── Laboratory (192.168.1.70)
├── Reception (192.168.1.80)
└── Admin Block (192.168.1.90)

Internet Connection
└── ISP Router → Firewall → API Server (outbound to Neon only)
```

---

## 5. UPS / Power Backup

| Device | Recommended UPS |
|--------|----------------|
| Primary Server | APC Smart-UPS 1500VA (gives ~45 min at full load) |
| Standby Server | APC Smart-UPS 1000VA (gives ~30 min) |
| Network Switch | APC Back-UPS 600VA |
| All Servers Combined | Generator auto-start if UPS < 10 min remaining |

> **Rule**: The generator must start within 5 minutes of mains failure. Configure the UPS management software to send a signal to the generator controller at 70% battery.

---

## 6. Biometric / RFID Clock-In Device Setup

Most devices (ZKTeco, Suprema, Anviz) support offline mode with internal flash storage:

1. **Device firmware**: Set server endpoint to `http://192.168.1.12:3000/api/attendance/push`
2. **Offline buffer**: Enable internal log mode — device stores up to 100,000 records
3. **Auto-push interval**: Set to push every 60 seconds when server is reachable
4. **Reconnect on restore**: Device automatically pushes buffered logs on reconnect

---

## 7. Manual Downtime Procedures

### Attendance Downtime Register

Use the physical register when all electronic systems fail:

| Column | Description |
|--------|-------------|
| Staff ID | Employee number |
| Full Name | As on ID card |
| Department | Ward/Unit |
| Clock In Time | Signed by staff |
| Clock Out Time | Signed by staff |
| Supervisor Initials | Must be signed |
| Entry Status | Pending system entry |

**Recovery procedure**:
1. Supervisor collects completed register
2. Admin enters records via **Attendance → Manual Entry** screen
3. Each record flagged with `isManualEntry: true` and `auditNote`
4. System generates exception report for HR review

### Clinical Downtime Forms

For clinical operations during full system outage:

| Module | Downtime Form |
|--------|--------------|
| Patient Registration | Paper registration form → scan to DMS on restore |
| OPD Billing | Manual receipt book → bulk entry on restore |
| Pharmacy Dispensing | Paper dispensing log → pharmacist verifies on restore |
| Lab Results | Paper report → scanned and linked on restore |
| Emergency | Emergency paper chart → entry within 2 hours of restore |

---

## 8. Monitoring & Alerts

### API Health Endpoints

```bash
# Overall system status
curl http://localhost:3000/api/system/status

# Sync queue metrics
curl http://localhost:3000/api/system/sync-status

# Last 10 failover events
curl http://localhost:3000/api/system/events?limit=10
```

### Recommended Monitoring Stack

| Tool | Purpose |
|------|---------|
| **Prometheus + Grafana** | Server CPU, memory, disk, PostgreSQL metrics |
| **pgBadger** | PostgreSQL query analysis and slow query log |
| **PM2** | Node.js process management and auto-restart |
| **Netdata** | Real-time system metrics (easy setup) |
| **UptimeRobot** | External health check on cloud endpoint |

### Alert Thresholds

| Metric | Warning | Critical |
|--------|---------|---------|
| Primary DB CPU | > 70% | > 90% |
| Disk usage | > 75% | > 90% |
| Replication lag | > 30s | > 5 min |
| Sync queue FAILED | > 10 | > 50 |
| UPS battery | < 50% | < 20% |

---

## 9. Recovery Checklist After Outage

- [ ] Primary server back online and PostgreSQL running
- [ ] Standby replication reconnected (check `pg_stat_replication`)
- [ ] API server `.env` updated if failover changed the primary IP
- [ ] Run `/api/system/force-failover` → `PRIMARY` via admin UI
- [ ] Run `/api/system/reverse-sync` to pull any cloud-fallback records
- [ ] Review exception report for records created during cloud-fallback mode
- [ ] Supervisor-approve any manual attendance entries
- [ ] HR reviews exception report and signs off
- [ ] IT team documents the outage in the incident log

---

*Document version: 1.0 — FF Mission Hospital, Ondo State, Nigeria*
*Last updated: July 2026*
