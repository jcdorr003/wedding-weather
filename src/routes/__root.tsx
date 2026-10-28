import { HeadContent, Outlet, Scripts, createRootRoute } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import loraFont from '@fontsource-variable/lora/files/lora-latin-wght-normal.woff2?url'
import workSansFont from '@fontsource-variable/work-sans/files/work-sans-latin-wght-normal.woff2?url'
import { skeletonHeadScript, touchIconScript } from '../lib/head-scripts'
import appCss from '../styles/app.css?url'

const BASE = import.meta.env.BASE_URL
const MOCK = import.meta.env.MODE === 'mock'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
      { name: 'color-scheme', content: 'light dark' },
      { name: 'theme-color', content: '#f8efe9', media: '(prefers-color-scheme: light)' },
      { name: 'theme-color', content: '#1a1012', media: '(prefers-color-scheme: dark)' },
      { name: 'apple-mobile-web-app-capable', content: 'yes' },
      { name: 'mobile-web-app-capable', content: 'yes' },
      { name: 'apple-mobile-web-app-title', content: 'Wedding Weather' },
      { name: 'apple-mobile-web-app-status-bar-style', content: 'default' },
      { name: 'format-detection', content: 'telephone=no' },
      { title: MOCK ? 'MOCK · Wedding Weekend Weather' : 'Wedding Weekend Weather' },
    ],
    links: [
      { rel: 'manifest', href: `${BASE}manifest.webmanifest` },
      // Fallback first: with only media-specific icons, Chrome also asks for /favicon.ico.
      { rel: 'icon', type: 'image/png', sizes: '64x64', href: `${BASE}icons/favicon-light.png` },
      {
        rel: 'icon',
        type: 'image/png',
        sizes: '64x64',
        href: `${BASE}icons/favicon-light.png`,
        media: '(prefers-color-scheme: light)',
      },
      {
        rel: 'icon',
        type: 'image/png',
        sizes: '64x64',
        href: `${BASE}icons/favicon-dark.png`,
        media: '(prefers-color-scheme: dark)',
      },
      { rel: 'apple-touch-icon', href: `${BASE}icons/apple-touch-icon.png`, id: 'touch-icon' },
      // Self-hosted fonts, preloaded so text doesn't reflow when they arrive. Builds only: the dev server serves
      // the stylesheet's copy from a different path, so a preload there would just download twice.
      ...(import.meta.env.PROD
        ? [
            { rel: 'preload', href: loraFont, as: 'font', type: 'font/woff2', crossOrigin: 'anonymous' as const },
            { rel: 'preload', href: workSansFont, as: 'font', type: 'font/woff2', crossOrigin: 'anonymous' as const },
          ]
        : []),
      { rel: 'stylesheet', href: appCss },
    ],
    scripts: [{ children: touchIconScript }, { children: skeletonHeadScript }],
  }),
  component: () => (
    <Document>
      <Outlet />
    </Document>
  ),
})

const Document = ({ children }: { children: ReactNode }) => (
  // The inline <head> script marks <html> with the skeleton shape before React hydrates.
  <html lang="en" suppressHydrationWarning>
    <head>
      <HeadContent />
    </head>
    <body>
      {children}
      <Scripts />
    </body>
  </html>
)
