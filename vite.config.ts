import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import babel from '@rolldown/plugin-babel'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import { msw } from 'msw/vite'
import { defineConfig } from 'vite'

// GitHub Pages serves the site under /wedding-weather/. Every page is prerendered to static HTML;
// forecast data is fetched in the browser, so there is no server at runtime.
export default defineConfig(({ mode }) => ({
  base: '/wedding-weather/',
  plugins: [
    tanstackStart({ prerender: { enabled: true, crawlLinks: true } }),
    react(),
    babel({ presets: [reactCompilerPreset()] }),
    // Mock mode (local preview with made-up forecasts) serves MSW's worker; real builds never include it.
    mode === 'mock' && msw(),
  ],
}))
