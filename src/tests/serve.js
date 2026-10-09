// Static server that mimics Vercel: serves ../site/ with the headers from ../vercel.json, "/" -> index.html, unknown -> 404.html.
const http = require('http'), fs = require('fs'), path = require('path');
const SITE = path.join(__dirname, '..', '..', 'site');
const cfg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'vercel.json'), 'utf8'));
const extra = {};
(cfg.headers || []).forEach(h => h.headers.forEach(x => { extra[x.key] = x.value; }));
function start() {
  return new Promise(res => {
    const srv = http.createServer((req, rsp) => {
      const p = decodeURIComponent(req.url.split('?')[0].split('#')[0]);
      let name = p === '/' ? 'index.html' : path.basename(p);
      let f = path.join(SITE, name), code = 200;
      if (!fs.existsSync(f) || p.split('/').length > 2) { f = path.join(SITE, '404.html'); code = 404; }
      const h = Object.assign({ 'content-type': 'text/html; charset=utf-8' }, extra);
      rsp.writeHead(code, h); rsp.end(fs.readFileSync(f));
    }).listen(0, '127.0.0.1', () => res({ srv, base: 'http://127.0.0.1:' + srv.address().port + '/' }));
  });
}
module.exports = { start };
