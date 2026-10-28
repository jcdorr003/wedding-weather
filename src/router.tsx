import { createRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'

// Same base path as Vite's `base` (GitHub Pages serves the site under /wedding-weather/).
export const getRouter = () => createRouter({ routeTree, basepath: import.meta.env.BASE_URL.replace(/\/$/, '') })
