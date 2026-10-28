# Independent recomputation of what the page should show, straight from the APIs.
import json, sys, urllib.request, urllib.parse
UA = {'User-Agent': 'wedding-weather-audit', 'Accept': 'application/geo+json'}
def get(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=30) as r: return json.load(r)
days = sys.argv[1].split(',')
pts = get('https://api.weather.gov/points/40.665,-73.971')['properties']
daily = get(pts['forecast'])['properties']['periods']
hourly = get(pts['forecastHourly'])['properties']['periods']
out = {'grid': f"{pts['gridId']} {pts['gridX']},{pts['gridY']}", 'days': {}, 'hours': {}, 'models': {}}
uncovered = []
for d in days:
    ps = [p for p in daily if p['startTime'][:10] == d]
    day = next((p for p in ps if p['isDaytime']), None); night = next((p for p in ps if not p['isDaytime']), None)
    if not ps: uncovered.append(d); out['days'][d] = None; continue
    main = day or night
    out['days'][d] = {'hi': day and day['temperature'], 'lo': night and night['temperature'], 'pop': (main['probabilityOfPrecipitation']['value'] or 0),
                      'night_pop': night and (night['probabilityOfPrecipitation']['value'] or 0), 'wind': main['windSpeed'], 'sky': main['shortForecast']}
for d in days[1:]:
    hs = {int(p['startTime'][11:13]): (p['probabilityOfPrecipitation']['value'] or 0) for p in hourly if p['startTime'][:10] == d}
    out['hours'][d] = [hs.get(h) for h in range(24)]
if uncovered:
    q = urllib.parse.urlencode({'latitude': 40.665, 'longitude': -73.971, 'hourly': 'precipitation', 'models': 'gfs_seamless,ecmwf_ifs025',
                                'precipitation_unit': 'inch', 'timezone': 'America/New_York', 'start_date': uncovered[0], 'end_date': uncovered[-1]})
    h = get('https://ensemble-api.open-meteo.com/v1/ensemble?' + q)['hourly']
    for d in uncovered:
        idx = [i for i, t in enumerate(h['time']) if t.startswith(d)]
        res = []
        for tag in ['gefs', 'ecmwf']:
            wet = tot = 0
            for k, v in h.items():
                if not k.startswith('precipitation') or tag not in k: continue
                vals = [v[i] for i in idx if v[i] is not None]
                if len(vals) < len(idx) * 0.75: continue
                tot += 1; wet += sum(vals) >= 0.04
            res.append(f'{wet} of {tot}')
        out['models'][d] = res
print(json.dumps(out))
