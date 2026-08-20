# Heartbeat checker — monitors the Mission Control Dashboard for new/changed tasks
# Runs every 60 seconds, compares task state, and notifies on changes.
# 
# Usage: This is loaded as a skill context for the cron job agent.
#
# STEP-BY-STEP EXECUTION PROTOCOL:
# 1. READ the current task snapshot from ~/.hermes/cron/state/task_snapshot.json
#    - If file doesn't exist, initialize with empty state {tasks: {}, last_check: null}
# 2. QUERY Supabase REST API for all active/backlog/in_review tasks
#    URL: $NEXT_PUBLIC_SUPABASE_URL/rest/v1/tasks?select=id,title,status,priority,assigned_agent&order=created_at.desc
#    Headers: apikey=$NEXT_PUBLIC_SUPABASE_ANON_KEY, Authorization=Bearer $NEXT_PUBLIC_SUPABASE_ANON_KEY
# 3. COMPARE new data against snapshot:
#    - NEW tasks (id not in snapshot.tasks): these just got created/updated
#    - CHANGED status (different from snapshot.tasks[id].status): status transitioned
# 4. BUILD notification text for any changes found
# 5. REPORT changes using terminal command: curl -X POST -H "Content-Type: application/json" -d '{"content": "..."}' "$DISCORD_WEBHOOK_URL"
# 6. UPDATE snapshot file with new full task list
# 7. FINAL RESPONSE: Report what changed (if anything) for delivery

import subprocess, os, json, urllib.request, time

os.chdir('/root/mission-control-dashboard')

# Load environment variables
env_vars = {}
with open('.env.local') as f:
    for line in f:
        line = line.strip()
        if '=' in line and not line.startswith('#'):
            key, val = line.split('=', 1)
            env_vars[key] = val.strip('"\'')

supabase_url = env_vars.get('NEXT_PUBLIC_SUPABASE_URL', '')
anon_key = env_vars.get('NEXT_PUBLIC_SUPABASE_ANON_KEY', '')
discord_webhook = env_vars.get('DISCORD_WEBHOOK_URL', '')

if not supabase_url or not anon_key:
    print("SKIP: Missing Supabase credentials in .env.local")
    exit(0)

# Step 1: Read previous snapshot
snapshot_path = '/root/.hermes/cron/state/task_snapshot.json'
os.makedirs(os.path.dirname(snapshot_path), exist_ok=True)

try:
    with open(snapshot_path) as f:
        prev = json.loads(f.read())
except FileNotFoundError:
    prev = {'tasks': {}}

prev_tasks = prev.get('tasks', {})

# Step 2: Query current tasks from Supabase
headers = {
    'apikey': anon_key,
    'Authorization': f'Bearer {anon_key}',
}

req = urllib.request.Request(
    f'{supabase_url}/rest/v1/tasks?select=id,title,status,priority,assigned_agent,owner&or=(status.neq.deprecated)&order=created_at.desc',
    headers=headers,
    method='GET'
)

resp = urllib.request.urlopen(req, timeout=15)
current_data = json.loads(resp.read())

current_tasks = {}
for t in current_data:
    tid = str(t['id'])
    current_tasks[tid] = {
        'title': t['title'],
        'status': t['status'],
        'priority': t.get('priority', 'medium'),
        'assigned_agent': t.get('assigned_agent', 'unassigned'),
    }

# Step 3: Compare and find changes
changes = []

# Check for new tasks and status changes
all_ids = set(prev_tasks.keys()) | set(current_tasks.keys())

for tid in sorted(all_ids, key=int):
    if tid in current_tasks and tid in prev_tasks:
        # Same task exists in both — check for status/priority changes
        curr = current_tasks[tid]
        prev = prev_tasks[tid]
        if curr['status'] != prev.get('status'):
            old_s = prev.get('status', '?')
            new_s = curr['status']
            changes.append({'type': 'STATUS_CHANGED', 'id': tid, 'title': curr['title'], 'from': old_s, 'to': new_s})
    elif tid in current_tasks and tid not in prev_tasks:
        # Brand new task
        t = current_tasks[tid]
        changes.append({'type': 'NEW_TASK', 'id': tid, 'title': t['title'], 'status': t['status'], 'priority': t['priority'], 'assigned_agent': t['assigned_agent']})

# Step 4: Build notification
if not changes:
    print("NO_CHANGE: No new tasks or status changes detected.")
    exit(0)

notify_lines = ['### 📋 Mission Control — Activity Detected\n']

for c in changes:
    if c['type'] == 'NEW_TASK':
        priority_emoji = {'critical': '🔴', 'high': '🟠', 'medium': '🟡', 'low': '⚪'}.get(c['priority'], '🟢')
        notify_lines.append(f'**New Task** #{c["id"]}: **{c["title"]}**\nPriority: {priority_emoji} {c["priority"]} | Status: {c["status"]} | Agent: {c["assigned_agent"]}\n')
    elif c['type'] == 'STATUS_CHANGED':
        notify_lines.append(f'**Status Changed** #{c["id"]}: **{c["title"]}**\n➜ `{c["from"]}` → `{c["to"]}`\n')

notification_text = ''.join(notify_lines).strip()

print(f"CHANGES_DETECTED: {len(changes)} task event(s)\n")
print(notification_text[:500])

# Step 5: Send to Discord webhook if configured
if discord_webhook and len(discord_webhook) > 10:
    try:
        payload = {
            'content': notification_text[:2000],
            'allowed_mentions': {'parse': []}
        }
        req_discord = urllib.request.Request(
            discord_webhook,
            data=json.dumps(payload).encode(),
            headers={'Content-Type': 'application/json'},
            method='POST'
        )
        resp_d = urllib.request.urlopen(req_discord, timeout=10)
        print(f"\n✅ Sent to Discord: HTTP {resp_d.status}")
    except Exception as e:
        print(f"\n❌ Discord failed: {e}")

# Step 6: Update snapshot
prev['tasks'] = current_tasks
prev['last_check'] = time.time()
prev['checked_at_utc'] = time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())

with open(snapshot_path, 'w') as f:
    f.write(json.dumps(prev, indent=2))

print(f"\n✅ Snapshot updated: {len(current_tasks)} tasks tracked")
