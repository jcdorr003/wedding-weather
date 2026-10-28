"""Independent recomputation of what the page should show, straight from the raw APIs.

Deliberately separate from the app's TypeScript (different language, no shared code), so a bug in one doesn't hide
in the other. Usage: python3 expected.py 2026-11-05,2026-11-06,2026-11-07 > expected.json
"""
import json
import sys
import urllib.parse
import urllib.request
from datetime import datetime, timedelta

UA = {'User-Agent': 'wedding-weather-audit', 'Accept': 'application/geo+json'}
LAT, LON = 40.665, -73.971


def get(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=30) as r:
        return json.load(r)


def inches(mm):
    return 'None' if mm == 0 else '<0.01 in' if mm / 25.4 < 0.01 else f'{mm / 25.4:.2f} in'


def hours_of(duration):  # "PT6H" / "P1DT2H"
    days, _, rest = duration[1:].partition('T') if 'T' in duration else (duration[1:], '', '')
    return int(days.rstrip('D') or 0) * 24 + int(rest.rstrip('H') or 0)


days = sys.argv[1].split(',')
pts = get(f'https://api.weather.gov/points/{LAT},{LON}')['properties']
daily = get(pts['forecast'])['properties']['periods']
hourly = get(pts['forecastHourly'])['properties']['periods']
grid = get(pts['forecastGridData'])['properties']
out = {'grid': f"{pts['gridId']} {pts['gridX']},{pts['gridY']}", 'days': {}, 'hours': {}, 'models': {}, 'parts': {}}

uncovered = []
for d in days:
    ps = [p for p in daily if p['startTime'][:10] == d]
    day = next((p for p in ps if p['isDaytime']), None)
    # The night is the period starting in the evening, not the 12–6 AM "Overnight" one.
    night = next((p for p in ps if not p['isDaytime'] and int(p['startTime'][11:13]) >= 12), None)
    main = day or night
    if not main:
        uncovered.append(d)
        out['days'][d] = None
        continue
    pop = lambda p: p['probabilityOfPrecipitation']['value'] or 0
    out['days'][d] = {'hi': day and day['temperature'], 'lo': night and night['temperature'], 'pop': pop(main),
                      'night_pop': night and pop(night), 'wind': main['windSpeed'], 'sky': main['shortForecast']}

for d in days[1:]:
    hs = {}
    for p in hourly:
        if p['startTime'][:10] == d:
            hs.setdefault(int(p['startTime'][11:13]), p['probabilityOfPrecipitation']['value'] or 0)
    out['hours'][d] = [hs.get(h) for h in range(24)]

# Rain amounts per 6-hour block from 06Z, only where NWS amounts exactly fill the block.
qpf = [(datetime.fromisoformat(v['validTime'].split('/')[0]), hours_of(v['validTime'].split('/')[1]), v['value'] or 0)
       for v in grid['quantitativePrecipitation']['values']]
for d in days:
    base = datetime.fromisoformat(d + 'T06:00:00+00:00')
    cells = []
    for i in range(4):
        a, b = base + timedelta(hours=6 * i), base + timedelta(hours=6 * i + 6)
        inside = [q for q in qpf if q[0] < b and q[0] + timedelta(hours=q[1]) > a]
        exact = not any(q[0] < a or q[0] + timedelta(hours=q[1]) > b for q in inside) and sum(q[1] for q in inside) >= 6
        cells.append(inches(sum(q[2] for q in inside)) if exact else '—')
    out['parts'][d] = cells

if uncovered:
    q = urllib.parse.urlencode({'latitude': LAT, 'longitude': LON, 'hourly': 'precipitation',
                                'models': 'gfs_seamless,ecmwf_ifs025', 'precipitation_unit': 'inch',
                                'timezone': 'America/New_York', 'start_date': uncovered[0], 'end_date': uncovered[-1]})
    h = get('https://ensemble-api.open-meteo.com/v1/ensemble?' + q)['hourly']
    for d in uncovered:
        idx = [i for i, t in enumerate(h['time']) if t.startswith(d)]
        res = []
        for tag in ['gefs', 'ecmwf']:
            wet = tot = 0
            for k, v in h.items():
                if not k.startswith('precipitation') or tag not in k:
                    continue
                vals = [v[i] for i in idx if v[i] is not None]
                if len(vals) < len(idx) * 0.75:
                    continue
                tot += 1
                wet += sum(vals) >= 0.04
            res.append(f'{wet} of {tot}')
        out['models'][d] = res

print(json.dumps(out))
