import re
import json
import urllib.request
import urllib.parse
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CFG = ROOT / 'config.js'
if not CFG.exists():
    print('config.js not found at', CFG)
    sys.exit(1)
text = CFG.read_text(encoding='utf-8')
url_m = re.search(r"SUPA_URL:\s*'([^']+)'", text)
key_m = re.search(r"SUPA_ANON:\s*'([^']+)'", text)
if not url_m or not key_m:
    print('Could not parse SUPA_URL or SUPA_ANON from config.js')
    sys.exit(1)
SUPA_URL = url_m.group(1).rstrip('/')
SUPA_ANON = key_m.group(1)

headers = {
    'apikey': SUPA_ANON,
    'Authorization': f'Bearer {SUPA_ANON}',
    'Accept': 'application/json'
}

def get(path, params=None):
    qs = ''
    if params:
        qs = '?' + urllib.parse.urlencode(params, doseq=True)
    req = urllib.request.Request(SUPA_URL + '/rest/v1/' + path + qs, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return json.load(resp)
    except urllib.error.HTTPError as e:
        body = e.read().decode('utf-8', 'replace')
        print('HTTPError', e.code, e.reason)
        print(body)
        sys.exit(1)
    except Exception as e:
        print('Error', e)
        sys.exit(1)

# Fetch recent 50 questions (open field and all clusters)
# Request profiles via foreign key relationships if available
qs = get('questions', params=[('select','id,asker_id,created_at,text,cluster_id,profiles(display_name)'), ('order','created_at.desc'), ('limit',50)])
print(f'Fetched {len(qs)} questions')

unregistered = []
registered = []
unknown = []
for q in qs:
    ask = q.get('asker_id')
    prof = q.get('profiles')
    if ask in (None,'') and not prof:
        # anonymous / community
        unknown.append((q.get('id'), q.get('text')[:80].replace('\n',' ')))
    else:
        if prof:
            registered.append((q.get('id'), prof.get('display_name'), ask))
        else:
            # ask has value but no profile joined via FK — double-check profiles table
            pid = ask
            if pid:
                p = get('profiles', params=[('select','id,display_name'), ('id','eq.'+pid)])
                if p and len(p)>0:
                    registered.append((q.get('id'), p[0].get('display_name'), pid))
                else:
                    unregistered.append((q.get('id'), pid, q.get('text')[:80].replace('\n',' ')))
            else:
                unknown.append((q.get('id'), q.get('text')[:80].replace('\n',' ')))

print('\nRegistered askers (sample):')
for r in registered[:20]:
    print('-', r)
print(f'\nUnregistered askers (count {len(unregistered)}):')
for u in unregistered[:20]:
    print('-', u)
print(f'\nAnonymous / community (count {len(unknown)}):')
for a in unknown[:20]:
    print('-', a)

print('\nDone')

# Also write a CSV report for easier review
try:
    import csv
    out = ROOT / 'scripts' / 'askers_report.csv'
    with out.open('w', newline='', encoding='utf-8') as f:
        w = csv.writer(f)
        w.writerow(['question_id','short_text','asker_id','profile_id','profile_name','cluster_id'])
        for q in qs:
            ask = q.get('asker_id')
            prof = q.get('profiles')
            pid = prof.get('id') if prof else ''
            pname = prof.get('display_name') if prof else ''
            w.writerow([q.get('id'), (q.get('text') or '')[:120].replace('\n',' '), ask or '', pid or '', pname or '', q.get('cluster_id') or ''])
    print('Wrote CSV report to', out)
except Exception as e:
    print('CSV write failed:', e)
