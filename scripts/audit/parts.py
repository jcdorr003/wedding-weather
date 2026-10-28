# Independent check of the time-of-day rain amounts against raw NWS grid data.
import json, sys, urllib.request
from datetime import datetime, timedelta, timezone
UA = {'User-Agent': 'wedding-weather-audit', 'Accept': 'application/geo+json'}
g = json.load(urllib.request.urlopen(urllib.request.Request('https://api.weather.gov/gridpoints/OKX/35,40', headers=UA), timeout=30))['properties']
q = []
for v in g['quantitativePrecipitation']['values']:
    start, dur = v['validTime'].split('/')
    t0 = datetime.fromisoformat(start); hrs = int(dur[2:-1]) if dur.startswith('PT') else None
    q.append((t0, hrs, v['value'] or 0))
out = {}
for d in sys.argv[1].split(','):
    base = datetime.fromisoformat(d + 'T06:00:00+00:00'); cells = []
    for i in range(4):
        a, b = base + timedelta(hours=6 * i), base + timedelta(hours=6 * i + 6)
        inside = [x for x in q if x[1] and x[0] < b and x[0] + timedelta(hours=x[1]) > a]
        if any(x[0] < a or x[0] + timedelta(hours=x[1]) > b for x in inside) or sum(x[1] for x in inside) < 6: cells.append('—')
        else:
            mm = sum(x[2] for x in inside); inch = mm / 25.4
            cells.append('None' if mm == 0 else '<0.01 in' if inch < 0.01 else f'{inch:.2f} in')
    out[d] = cells
print(json.dumps(out))
