// start a http server to serve the static file in data dir
import * as http from 'http';
import * as fs from 'fs';
import { MailLogger } from './utils.js';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';  

const __dirname = dirname(fileURLToPath(import.meta.url));

const server = http.createServer((req, res) => {
  const url = req.url === '/' ? '/email.html' : req.url;
  const filePath = join(__dirname, 'data', url);
  MailLogger('http', `request: ${url}`);
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, {'Content-Type': 'text/html'});
      return res.end("404 Not Found");
    }
    res.writeHead(200, {'Content-Type': 'text/html'});
    res.write(data);
    return res.end();
  });
});

export const start_server = (hostname, port) => {
  if (hostname === undefined) {
    hostname = '0.0.0.0';
  }
  if (port === undefined) {
    port = 3000;
  }
  server.listen(port, hostname, () => {
    MailLogger('http', `Server running at http://${hostname}:${port}`);
  });
  return server;
}
