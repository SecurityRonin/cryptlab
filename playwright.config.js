import { defineConfig } from '@playwright/test';

// Set BASE_URL to smoke-test a deployed site instead of a local server:
//   BASE_URL=https://securityronin-cryptlab.netlify.app npx playwright test
const target = process.env.BASE_URL;

export default defineConfig({
    testDir: './tests',
    use: {
        baseURL: target || 'http://localhost:3009',
        headless: true,
    },
    // no local server needed when pointing at a deployment
    webServer: target
        ? undefined
        : {
              // http.server's listen backlog is 5; parallel workers overflowed it and pages
              // failed with ERR_SOCKET_NOT_CONNECTED, so raise it rather than retry.
              command:
                  "python3 -c \"import functools,http.server as h; h.ThreadingHTTPServer.request_queue_size=128; " +
                  "h.test(HandlerClass=functools.partial(h.SimpleHTTPRequestHandler,directory='web'),ServerClass=h.ThreadingHTTPServer,port=3009)\"",
              port: 3009,
              reuseExistingServer: true,
              timeout: 10000,
          },
});
