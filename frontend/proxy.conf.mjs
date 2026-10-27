// Dev server proxy: the browser only talks to the dev server, which forwards /api to Symfony
// (port 8001, so that Avenger runs alongside another app on 8000)
const api = process.env['API_URL'] ?? 'http://127.0.0.1:8001';

// Path under which the app is served: "/" by default, "/absproxy/4300/" behind
// code-server (see the "code-server" configuration in angular.json)
const prefixes = ['', '/absproxy/4300'];

export default Object.fromEntries(
  prefixes.map((prefix) => [
    `${prefix}/api`,
    {
      target: api,
      secure: false,
      rewrite: (path) => path.slice(prefix.length),
    },
  ]),
);
