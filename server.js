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

export default async function handler(req, res) {
  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;

  // Polyfill express-like status/json helpers for Serverless & Native HTTP compatibility
  if (!res.status) {
    res.status = function(code) {
      res.statusCode = code;
      return res;
    };
  }
  if (!res.json) {
    res.json = function(data) {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify(data, null, 2));
    };
  }

  // Handle API routes
  if (pathname === '/api/stations' || pathname === '/api/stations.js') {
    try {
      const { default: apiHandler } = await import('./api/stations.js');
      return await apiHandler(req, res);
    } catch (err) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ error: err.message }));
    }
  }

  if (pathname === '/api/ingest' || pathname === '/api/ingest.js') {
    try {
      const { default: apiHandler } = await import('./api/ingest.js');
      return await apiHandler(req, res);
    } catch (err) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ error: err.message }));
    }
  }

  // Handle Static Files
  let filePath = path.join(__dirname, pathname === '/' ? 'index.html' : pathname);

  try {
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';
      res.setHeader('Content-Type', contentType);
      return fs.createReadStream(filePath).pipe(res);
    }

    // Fallback to index.html for client-side routing
    const indexPath = path.join(__dirname, 'index.html');
    if (fs.existsSync(indexPath)) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return fs.createReadStream(indexPath).pipe(res);
    }
  } catch (err) {
    console.error('Static serve error:', err);
  }

  res.statusCode = 404;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.end('<h1>404 Not Found</h1><p>Resource not found on AirSense server.</p>');
}

const server = http.createServer(handler);

// Only listen on port if not in Vercel Serverless environment
if (!process.env.VERCEL && !process.env.NOW_REGION) {
  server.listen(PORT, () => {
    console.log(`🌿 AirSense Delhi server running at: http://localhost:${PORT}`);
  });
}
