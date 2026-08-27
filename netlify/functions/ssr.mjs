/**
 * Netlify Function (Functions v2 format) serving the Remix SSR build on the
 * Node runtime.
 *
 * How it fits together:
 *  - `pnpm run netlify:build` builds the app with
 *    `REMIX_SERVER_BUILD_TARGET=netlify`, which aliases the Cloudflare Remix
 *    runtime to the Node one in vite.config.ts and emits the server bundle to
 *    `build/server/index.js`.
 *  - Netlify packages `netlify/functions/ssr.mjs` after the build command has
 *    finished, so the dynamic import below resolves to the fresh server build
 *    (guaranteed additionally via `included_files` in netlify.toml).
 *  - Routes receive `{ cloudflare: { env } }` as the loader/action context so
 *    the existing `context.cloudflare?.env` accesses keep working unchanged,
 *    exposing Node's `process.env` (i.e. environment variables configured in
 *    the Netlify UI / CLI).
 */
import { createRequestHandler } from '@remix-run/node';

const serverBuildPromise = import('../../build/server/index.js');

let remixHandler;

// Compatibility shim for code written against the Cloudflare runtime.
// Mirrors electron/main/index.ts, which already serves this same server
// build from a pure Node environment.
const getLoadContext = () => ({
  cloudflare: {
    env: process.env,
  },
});

export default async function ssr(request) {
  const serverBuild = await serverBuildPromise;

  remixHandler ??= createRequestHandler(serverBuild, 'production');

  return remixHandler(request, getLoadContext());
}