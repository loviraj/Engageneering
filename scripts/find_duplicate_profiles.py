import re, json, urllib.request, urllib.parse
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
CFG = ROOT / 'config.js'
text = CFG.read_text(encoding='utf-8')
url = re.search(r"SUPA_URL:\s*'([^']+)'", text).group(1).rstrip('/')
key = re.search(r"SUPA_ANON:\s*'([^']+)'", text).group(1)
headers = {'apikey': key, 'Authorization': f'Bearer {key}', 'Accept': 'application/json'}

def get(path, params=None):
    qs = ''
    if params:
        qs = '?' + urllib.parse.urlencode(params, doseq=True)
    req = urllib.request.Request(url + '/rest/v1/' + path + qs, headers=headers)
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.load(resp)

profiles = get('profiles', params=[('select','id,display_name,email'), ('limit',1000)])
byname = {}
for p in profiles:
    name = (p.get('display_name') or '').strip()
    if not name: continue
    byname.setdefault(name, []).append(p)

dups = {n:lst for n,lst in byname.items() if len(lst)>1}
print(f'Found {len(dups)} duplicate display names')
for name, lst in dups.items():
    print('-', name)
    for p in lst:
        print('   ', p.get('id'), p.get('email'))

# write CSV
import csv
out = ROOT / 'scripts' / 'duplicate_profiles.csv'
with out.open('w', newline='', encoding='utf-8') as f:
    w=csv.writer(f)
    w.writerow(['display_name','id','email'])
    for name,lst in byname.items():
        if len(lst)>1:
            for p in lst:
                w.writerow([name,p.get('id'),p.get('email')])
print('Wrote', out)
