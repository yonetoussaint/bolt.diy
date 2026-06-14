import { defineConfig } from '@remix-run/dev';

const isNetlify = process.env.REMIX_SERVER_BUILD_TARGET === 'netlify';

export default defineConfig({
  serverBuildTarget: isNetlify ? 'netlify' : 'cloudflare',
  server: isNetlify ? './netlify/index.js' : './build/index.js',
  appDirectory: 'app',
  assetsBuildDirectory: 'public/build',
  publicPath: '/build/',
  ignoredRouteFiles: ['**/.*'],
  future: {
    v3_fetcherPersist: true,
    v3_relativeSplatPath: true,
    v3_throwAbortReason: true,
    v3_lazyRouteDiscovery: true,
  },
});
