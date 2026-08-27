import type { AppLoadContext } from '@remix-run/node';
import { RemixServer } from '@remix-run/react';
import { isbot } from 'isbot';
import { renderHeadToString } from 'remix-island';
import { Head } from './root';
import { themeStore } from '~/lib/stores/theme';

/*
 * Use a lazy dynamic import for ``react-dom/server`` so that the ESM → CJS
 * interop does not blow up on the Netlify Node runtime.  ``react-dom/server``
 * ships a CommonJS build that does not expose named ES exports, but a dynamic
 * ``import()`` always goes through CJS-module-wrapper which normalises
 * ``module.exports`` into a namespace object.
 *
 * Reference: https://nodejs.org/api/packages.html#named-exports
 */
type RenderToReadableStream = (
  reactElement: React.ReactElement,
  options: {
    signal: AbortSignal;
    onError: (error: unknown) => void;
  },
) => Promise<ReadableStream<Uint8Array> & { allReady: Promise<void> }>;

let _renderToReadableStream: RenderToReadableStream | null = null;

async function getRenderToReadableStream(): Promise<RenderToReadableStream> {
  if (_renderToReadableStream === null) {
    const mod = await import('react-dom/server');

    /*
     * ``import()`` on a CJS module returns a namespace where the whole
     * ``module.exports`` is placed under ``.default``.
     */

    _renderToReadableStream = (mod as any).renderToReadableStream ?? (mod as any).default?.renderToReadableStream;
  }

  return _renderToReadableStream!;
}

export default async function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  remixContext: any,
  _loadContext: AppLoadContext,
) {
  // await initializeModelList({});

  const renderToReadableStream = await getRenderToReadableStream();

  const readable = await renderToReadableStream(<RemixServer context={remixContext} url={request.url} />, {
    signal: request.signal,
    onError(error: unknown) {
      console.error(error);
      responseStatusCode = 500;
    },
  });

  const body = new ReadableStream({
    start(controller) {
      const head = renderHeadToString({ request, remixContext, Head });

      controller.enqueue(
        new Uint8Array(
          new TextEncoder().encode(
            `<!DOCTYPE html><html lang="en" data-theme="${themeStore.value}"><head>${head}</head><body><div id="root" class="w-full h-full">`,
          ),
        ),
      );

      const reader = readable.getReader();

      function read() {
        reader
          .read()
          .then(({ done, value }) => {
            if (done) {
              controller.enqueue(new Uint8Array(new TextEncoder().encode('</div></body></html>')));
              controller.close();

              return;
            }

            controller.enqueue(value);
            read();
          })
          .catch((error) => {
            controller.error(error);
            readable.cancel();
          });
      }
      read();
    },

    cancel() {
      readable.cancel();
    },
  });

  if (isbot(request.headers.get('user-agent') || '')) {
    await readable.allReady;
  }

  responseHeaders.set('Content-Type', 'text/html');

  responseHeaders.set('Cross-Origin-Embedder-Policy', 'require-corp');
  responseHeaders.set('Cross-Origin-Opener-Policy', 'same-origin');

  return new Response(body, {
    headers: responseHeaders,
    status: responseStatusCode,
  });
}
