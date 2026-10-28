"""Compare what a page shows (extract.mjs) with the independent recomputation (expected.py).

Usage: python3 compare.py expected.json page.json 2026-11-05,2026-11-06,2026-11-07   (exit code 1 on a mismatch)
"""
import json
import sys

exp = json.load(open(sys.argv[1]))
got = json.load(open(sys.argv[2]))
days = sys.argv[3].split(',')
problems = []


def check(label, page, expected):
    if page != expected:
        problems.append(f'{label}: page={page!r} expected={expected!r}')


for i, d in enumerate(days):
    e, g = exp['days'][d], got['days'][i]
    if e is None:
        if exp['models'].get(d):
            check(f'{d} model runs', [r.replace(' runs', '') for r in g['runs']], exp['models'][d])
        else:
            check(f'{d} pending', g['pending'], 'Not in the forecast yet')
        continue
    check(f'{d} high', g['hi'], f"{e['hi']}°" if e['hi'] is not None else '—')
    if e['lo'] is not None:
        check(f'{d} low', g['lo'], f"Low {e['lo']}°")
    check(f'{d} rain', g['rain'], f"{round(e['pop'])}%")
    if e['night_pop'] is not None and e['hi'] is not None:
        check(f'{d} night rain', g['rainNight'], f"Night {round(e['night_pop'])}%")
    check(f'{d} wind', g['wind'].replace('–', ' to '), e['wind'])
    check(f'{d} sky', g['sky'], e['sky'])
    for block, (page, expected) in enumerate(zip(g['parts'], exp['parts'][d])):
        if page != 'Passed':
            check(f'{d} rain amount, block {block + 1}', page, expected)

for i, d in enumerate(days[1:]):
    check(f'{d} hourly rain', got['hours'][i], exp['hours'][d])
check('grid', exp['grid'].replace(' ', ' grid ') in got['footer'], True)
check('page errors', got['errors'], [])
check('horizontal overflow', got['overflow'], 0)

print('MATCH' if not problems else 'MISMATCH')
for p in problems:
    print(' -', p)
sys.exit(1 if problems else 0)
