import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'image-cache-headers',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          // Serve index.html for the public display route
          if ((req.url || '').startsWith('/display')) {
            req.url = '/';
          }

          const url = req.url || '';
          const urlPath = url.split('?')[0];
          const isCarImage = urlPath.includes('/standard_cars/') || urlPath.includes('/standard_hero_shots/');
          const isLogo = urlPath.includes('/logos/');

          if (isCarImage) {
            const filePath = path.join(process.cwd(), decodeURIComponent(urlPath));
            if (!fs.existsSync(filePath)) {
              const fallbackName = urlPath.includes('/standard_hero_shots/') ? 'mystery_hero.jpg' : 'mystery_side.jpg';
              const fallbackPath = path.join(process.cwd(), fallbackName);
              res.writeHead(200, { 'Content-Type': 'image/jpeg', 'Cache-Control': 'no-cache' });
              fs.createReadStream(fallbackPath).pipe(res);
              return;
            }
          }

          if (isCarImage || isLogo) {
            const originalWriteHead = res.writeHead.bind(res);
            res.writeHead = function(statusCode, ...args) {
              if (statusCode === 200) {
                res.setHeader('Cache-Control', url.includes('?t=')
                  ? 'public, max-age=31536000, immutable'
                  : 'public, max-age=3600');
              }
              return originalWriteHead(statusCode, ...args);
            };
          }

          next();
        });
      }
    }
  ]
})
