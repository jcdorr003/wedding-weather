// Serve a built site the way GitHub Pages does: under /wedding-weather/, folders map to index.html.
// Usage: node scripts/serve.mjs <dir> [port]
import { createReadStream, statSync } from 'node:fs'
import { createServer } from 'node:http'
import { extname, join, resolve, sep } from 'node:path'

const [dir = 'dist/client', port = '4173'] = process.argv.slice(2)
const root = resolve(dir)
const BASE = '/wedding-weather/'
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
}

/** The file for a request path under BASE, or null (outside the site root, or missing). */
const fileFor = (path) => {
  const file = resolve(root, `.${sep}${path.slice(BASE.length)}`)
  if (file !== root && !file.startsWith(root + sep)) return null
  try {
    return statSync(file).isDirectory() ? (statSync(join(file, 'index.html')), join(file, 'index.html')) : file
  } catch {
    return null
  }
}

createServer((req, res) => {
  const path = decodeURIComponent(new URL(req.url ?? '/', 'http://localhost').pathname)
  if (path === '/' || path === BASE.slice(0, -1)) {
    res.writeHead(302, { Location: BASE }).end()
    return
  }
  const file = path.startsWith(BASE) ? fileFor(path) : null
  if (!file) {
    res.writeHead(404).end('Not found')
    return
  }
  res.writeHead(200, { 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream' })
  createReadStream(file).pipe(res)
}).listen(Number(port), () => console.log(`Serving ${dir} at http://localhost:${port}${BASE}`))
