import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env file automatically if present
try {
  if (fs.existsSync(path.join(__dirname, '.env'))) {
    if (process.loadEnvFile) {
      process.loadEnvFile(path.join(__dirname, '.env'));
      console.log('🔑 Loaded environment variables from .env');
    }
  }
} catch (e) {
  console.warn('Note: .env file not parsed:', e.message);
}

const PORT = process.env.PORT || 3000;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp'
};

const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;

  // Handle API routes
  if (pathname === '/api/stations' || pathname === '/api/stations.js') {
    try {
      const { default: handler } = await import('./api/stations.js');
      // Create mock express-like response methods if needed
      const customRes = {
        setHeader: (name, val) => res.setHeader(name, val),
        status: (code) => {
          res.statusCode = code;
          return {
            json: (data) => {
              res.setHeader('Content-Type', 'application/json; charset=utf-8');
              res.end(JSON.stringify(data, null, 2));
            },
            send: (data) => res.end(data)
          };
        }
      };
      return await handler(req, customRes);
    } catch (err) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ error: err.message }));
    }
  }

  if (pathname === '/api/ingest' || pathname === '/api/ingest.js') {
    try {
      const { default: handler } = await import('./api/ingest.js');
      const customRes = {
        setHeader: (name, val) => res.setHeader(name, val),
        status: (code) => {
          res.statusCode = code;
          return {
            json: (data) => {
              res.setHeader('Content-Type', 'application/json; charset=utf-8');
              res.end(JSON.stringify(data, null, 2));
            },
            send: (data) => res.end(data)
          };
        }
      };
      return await handler(req, customRes);
    } catch (err) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ error: err.message }));
    }
  }

  // Handle Static Files
  let filePath = path.join(__dirname, pathname === '/' ? 'index.html' : pathname);

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.end('<h1>404 Not Found</h1><p>Resource not found on AirSense server.</p>');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  });
});

server.listen(PORT, () => {
  console.log(`🌿 AirSense Delhi server running at: http://localhost:${PORT}`);
});
