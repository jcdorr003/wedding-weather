"""Build dev/wedding-weather-mock.html: the real index.html with mock data swapped in for fetch().

Usage (from the repo root):  python3 dev/build-mock.py
Then open dev/wedding-weather-mock.html in a browser and use the scenario buttons at the top.
"""
from pathlib import Path

root = Path(__file__).resolve().parent.parent
page = (root / 'legacy' / 'index.html').read_text()
mock = (root / 'dev' / 'mock-data.js').read_text()

page = page.replace('<title>Wedding Weekend Weather</title>', '<title>MOCK · Wedding Weekend Weather</title>', 1)
anchor = '<link rel="manifest" href="manifest.webmanifest">'
assert page.count(anchor) == 1, 'manifest link not found in index.html'
page = page.replace(anchor, '<script>\n' + mock + '\n</script>')
# The mock is a standalone local file: point icons at the live site.
live = 'https://jcdorr003.github.io/wedding-weather/icons/'
page = page.replace('href="icons/', f'href="{live}').replace("'icons/apple-touch-icon", f"'{live}apple-touch-icon")

out = root / 'dev' / 'wedding-weather-mock.html'
out.write_text(page)
print(f'wrote {out}')
