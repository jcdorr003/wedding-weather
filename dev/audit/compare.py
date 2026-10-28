import json, sys
exp = json.loads(open(sys.argv[1]).read()); got = json.loads(open(sys.argv[2]).read()); days = sys.argv[3].split(',')
problems = []
def check(label, a, b):
    if a != b: problems.append(f'{label}: page={a!r} expected={b!r}')
for i, d in enumerate(days):
    e, g = exp['days'][d], got['days'][i]
    if e is None:
        if exp['models'].get(d): check(f'{d} model runs', [r.replace(' runs', '') for r in g['runs']], exp['models'][d])
        else: check(f'{d} pending', g['pending'], 'Not in the forecast yet')
        continue
    check(f'{d} high', g['hi'], f"{e['hi']}°" if e['hi'] is not None else '—')
    if e['lo'] is not None: check(f'{d} low', g['lo'], f"Low {e['lo']}°")
    check(f'{d} rain', g['stats'][0], f"{round(e['pop'])}%")
    if e['night_pop'] is not None and e['hi'] is not None: check(f'{d} night rain', g['stats'][1], f"Night {round(e['night_pop'])}%")
    check(f'{d} wind', g['stats'][-2].replace('–', ' to '), e['wind'])
    check(f'{d} sky', g['sky'], e['sky'])
for i, d in enumerate(days[1:]):
    check(f'{d} hourly rain', got['hours'][i], exp['hours'][d])
check('grid', exp['grid'].replace(' ', ' grid ') in got['footer'], True)
check('errors', got['errors'], []); check('overflow', got['overflow'], 0); check('notice', got['notice'].strip() in ('',) or got['notice'].startswith('Preview mode'), True)
print('MATCH' if not problems else 'MISMATCH'); [print(' -', p) for p in problems]
