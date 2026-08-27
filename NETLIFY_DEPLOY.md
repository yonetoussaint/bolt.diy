# Deploying bolt.diy to Netlify

This repository ships two working deployment targets:

| Target | Runtime | Entry point | Command |
|---|---|---|---|
| **Netlify** ✅ | Node 18+ (Netlify Functions v2) | `netlify/functions/ssr.mjs` | `npm run netlify:build` |
| Cloudflare Pages | workerd | `functions/[[path]].ts` | `pnpm run build` |
| Docker / Electron | Node | `Dockerfile` / `electron/main/index.ts` | unchanged |

Both web targets build from the **same Remix app source** – no code duplication.

---

## 1. What makes Netlify work here

* **Broken dependency fixed** – `package.json` previously required
  `@remix-run/netlify@^2.15.2`, a version that does not exist on npm
  (the last release ever published was `1.19.3`). This made
  `pnpm install` fail *for everyone*, locally and in CI. The phantom
  dependency has been removed; installs now complete cleanly.

* **SSR function** – `netlify/functions/ssr.mjs` wraps the Remix server
  build (`build/server/index.js`) with `createRequestHandler(...)` exactly
  like the existing Electron entry does under plain Node. Routes receive

  ```js
  { cloudflare: { env: process.env } }
  ```

  as their load context, so all the `context.cloudflare?.env` accesses in
  route files keep working **unchanged**, while reading server secrets from
  your Netlify environment variables.

* **Routing** – `netlify.toml` publishes `build/client` to the CDN and adds a
  non-forced catch-all redirect to `/.netlify/functions/ssr`. Because the
  redirect uses `force = false`, real files (hashed JS/CSS assets,
  `favicon.ico`, …) are always served straight from the CDN and only
  page/API routes hit the function.

* **Build safety** – `[functions] included_files = ["build/server/**"]`
  guarantees the freshly built server bundle ships inside the function
  package even if the dependency tracer misses the dynamic import.

* **Dev proxy gating** – `vite.config.ts` only skips the Cloudflare dev
  proxy when `REMIX_SERVER_BUILD_TARGET=netlify` (used by `netlify:dev`);
  the production build output is byte-identical to the Cloudflare one.

## 2. Deploy options

### Option A – Connect the Git repository (recommended)

1. Push this repo to GitHub/GitLab/Bitbucket.
2. In Netlify: **Add new site → Import an existing project** and pick the repo.
3. Netlify reads `netlify.toml`; defaults resolve automatically:
   * Build command: `npm run netlify:build`
   * Publish directory: `build/client`
   * Functions directory: `netlify/functions`
4. Add the environment variables you need (see §3), then **Deploy site**.
5. Every push afterwards builds automatically (production branch + deploy previews).

### Option B – Netlify CLI

```bash
npm i -g netlify-cli          # or: brew install netlify-cli
netlify login
netlify init                  # link/create a site once
npm run netlify:deploy        # build + publish to production
```

`netlify dev` boots local SSR through the real function runtime at
`http://localhost:8888` (config lives in `netlify.toml` [dev] block).

## 3. Environment variables

Configure these in **Site settings → Environment variables**
(or `.env.local` when using `netlify dev`). Everything is **optional** –
without keys the UI still runs and users can paste provider API keys into
the in-app Settings dialog, which are kept client-side.

Server-side keys (read at runtime by the SSR function):

```
ANTHROPIC_API_KEY       OPENAI_API_KEY         GROQ_API_KEY
GOOGLE_GENERATIVE_AI_API_KEY   MISTRAL_API_KEY  DEEPSEEK_API_KEY
COHERE_API_KEY          FIREWORKS_API_KEY      CEREBRAS_API_KEY
PERPLEXITY_API_KEY      TOGETHER_API_KEY       XAI_API_KEY
MOONSHOT_API_KEY        ZAI_API_KEY            HYPERBOLIC_API_KEY
HuggingFace_API_KEY     GITHUB_API_KEY         OPENROUTER_API_KEY
OPENAI_LIKE_API_KEY / OPENAI_LIKE_API_BASE_URL / OPENAI_LIKE_API_MODELS
OLLAMA_API_BASE_URL     LMSTUDIO_API_BASE_URL  WEB_SEARCH_PROVIDER
```

(Complete annotated list: see `.env.example`.)

Build-time only (baked into the client bundle by Vite – must be present
*before* the build step, i.e. set them in the Netlify UI, not `.env.local`):

```
VITE_NETLIFY_ACCESS_TOKEN   # enables the built-in "deploy to Netlify" panel
VITE_VERCEL_ACCESS_TOKEN
VITE_SUPABASE_ACCESS_TOKEN
VITE_GITHUB_ACCESS_TOKEN    # used for template imports / GitHub features
```

## 4. Verify locally before pushing

```bash
pnpm install                          # must finish without ERR_PNPM_NO_MATCHING_VERSION
npm run typecheck                     # optional but recommended
npm run netlify:build                 # produces build/client + build/server
npx remix-serve ./build/server/index.js &    # boots the same bundle Netlify will run
curl -s localhost:3000 | head -c 200  # expect `<div id="root">` HTML
curl -s localhost:3000/api/health
kill %1
```

> ⚠️ **Constrained dev containers:** the full Vite production build peaks at
> several GB of RAM. On a memory-starved Codespace (or a laptop with many IDE
> processes running) Linux's OOM killer may terminate the build silently
> (exit status 137). Nothing is wrong with the project – close heavy editors /
> language servers, add swap, or bump the machine size and rerun
> `npm run netlify:build`. Netlify's own build machines complete it fine.

## 5. Runtime characteristics & limitations on Netlify

| Topic | Notes |
|---|---|
| Streaming LLM responses | Works via Functions v2 streamed responses. Very long completions can exceed the synchronous function execution limit on lower plans – streams may be cut mid-way. Check logs; consider plan limits or shorter `MAX_TOKENS`. |
| WebContainer previews | Unchanged – runs fully in the user's browser (client-side), independent of host platform. |
| Filesystem routes | `/api/git-info`, `/api/system/*`, MCP config endpoints etc. read the Node filesystem of the Lambda instance; they work but reflect ephemeral storage semantics. |
| Static assets | Served by the CDN, never through the function (`force = false` redirect). |

## 6. Troubleshooting

| Symptom | Cause / fix |
|---|---|
| `ERR_PNPM_NO_MATCHING_VERSION @remix-run/netlify` during install | You're on an old commit that still pinned the phantom dependency – pull latest. |
| 404 on every page, assets fine | Function missing: ensure `netlify/functions/ssr.mjs` is committed (it *was* blocked by an old `.gitignore` rule – fixed). Redeploy. |
| HTML loads but hashed assets 404 | Don't set `force = true` on the catch-all redirect. |
| Provider keys ignored although set | Keys feed the **runtime** env of functions; redeploy after adding them so a fresh function picks them up. |
| Long answers truncate | Sync function time limit reached (see §5). |
| `FATAL ERROR: ... JavaScript heap out of memory` during `rendering chunks...` | Vite needs more than Node's default heap (~2 GB). Fixed in-repo via `NODE_OPTIONS = "--max-old-space-size=4096"` in `netlify.toml [build.environment]`; raise it further if you add code. |