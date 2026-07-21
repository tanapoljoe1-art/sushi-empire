import { defineConfig } from 'vite';

// .mjs (not .js) so this can use `import` without adding "type":"module" to
// package.json — server.js is CommonJS (require()) and adding that field
// would break it on what's supposed to be a frontend-only build config.
export default defineConfig({
  root: 'public',
  // With root:'public', Vite's default publicDir convention looks for
  // public/public/ for raw static passthrough — not what we want here, since
  // public/ already *is* the app root. Disable it explicitly.
  publicDir: false,
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
  server: {
    // The Socket.io multiplayer backend in server.js has no client-side
    // caller yet, but proxying it now means wiring it up later doesn't
    // require touching this config.
    proxy: {
      '/socket.io': {
        target: 'http://localhost:3000',
        ws: true,
      },
    },
  },
});
