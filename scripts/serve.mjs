// Serve a built site the way GitHub Pages does: under /wedding-weather/, folders map to index.html.
// Usage: node scripts/serve.mjs <dir> [port]
import { createReadStream, statSync } from 'node:fs'
import { createServer } from 'node:http'
import { extname, join, normalize } from 'node:path'

const [dir = 'dist/client', port = '4173'] = process.argv.slice(2)
const BASE = '/wedding-weather/'
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
}

createServer((req, res) => {
  const path = decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname)
  if (path === '/' || path === BASE.slice(0, -1)) return res.writeHead(302, { Location: BASE }).end()
  if (!path.startsWith(BASE)) return res.writeHead(404).end('Not found')
  let file = join(dir, normalize(path.slice(BASE.length)).replace(/^(\.\.[/\\])+/, ''))
  try {
    if (statSync(file).isDirectory()) file = join(file, 'index.html')
    statSync(file)
  } catch {
    return res.writeHead(404).end('Not found')
  }
  res.writeHead(200, { 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream' })
  createReadStream(file).pipe(res)
}).listen(Number(port), () => console.log(`Serving ${dir} at http://localhost:${port}${BASE}`))
