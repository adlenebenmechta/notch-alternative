// Raw connectivity test — bypasses Next.js entirely.
// If this answers on :3000, the platform/network is fine and the issue is Next standalone.
const http = require("http");
const server = http.createServer((req, res) => {
  console.log(`[raw-test] ${req.method} ${req.url}`);
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("RAW-NODE-OK — server.js reachable on 0.0.0.0:3000\n");
});
server.listen(3000, "0.0.0.0", () => {
  console.log("[raw-test] RAW-LISTENING on 0.0.0.0:3000");
  console.log("[raw-test] node", process.version, "| cwd:", process.cwd());
});
