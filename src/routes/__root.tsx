import { HeadContent, Outlet, Scripts, createRootRoute } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import loraFont from '@fontsource-variable/lora/files/lora-latin-wght-normal.woff2?url'
import workSansFont from '@fontsource-variable/work-sans/files/work-sans-latin-wght-normal.woff2?url'
import { WEDDING_DAYS } from '../lib/config'
import { skeletonScript } from '../lib/skeleton'
import { SCENARIOS } from '../mocks/scenario-list'
import appCss from '../styles/app.css?url'

const BASE = import.meta.env.BASE_URL

// iOS can't switch a Home Screen icon with dark mode, so offer the dark one if the phone is dark when it's added.
const touchIconScript = `(() => {
  try {
    const dark = matchMedia('(prefers-color-scheme: dark)');
    const pick = () => {
      document.getElementById('touch-icon').href = '${BASE}' + (dark.matches ? 'icons/apple-touch-icon-dark.png' : 'icons/apple-touch-icon.png');
    };
    pick();
    dark.addEventListener('change', pick);
  } catch { /* keep the light icon */ }
})();`

// In mock builds the skeleton guess uses the scenario's pretend time, like the rest of the page.
const skeletonNow =
  import.meta.env.MODE === 'mock'
    ? `Date.parse((${JSON.stringify(Object.fromEntries(Object.entries(SCENARIOS).map(([k, v]) => [k, 'now' in v ? v.now : null])))})[new URLSearchParams(location.search).get('scenario') || 'wedding'] || '') || Date.now()`
    : undefined

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
      { title: import.meta.env.MODE === 'mock' ? 'MOCK · Wedding Weekend Weather' : 'Wedding Weekend Weather' },
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
    scripts: [{ children: touchIconScript }, { children: skeletonScript(WEDDING_DAYS, skeletonNow) }],
  }),
  component: () => (
    <Document>
      <Outlet />
    </Document>
  ),
})

function Document({ children }: { children: ReactNode }) {
  return (
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
}
