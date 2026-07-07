import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';

const port = Number(process.env.PORT ?? 4173);
createServer(async (req, res) => {
  try {
    const name = req.url === '/' ? '/textarea.html' : req.url;
    const file = new URL(`../tests/fixtures${name}`, import.meta.url);
    res.setHeader('content-type', 'text/html; charset=utf-8');
    res.end(await readFile(file));
  } catch {
    res.statusCode = 404;
    res.end('not found');
  }
}).listen(port, () => console.log(`fixtures on http://localhost:${port}`));
