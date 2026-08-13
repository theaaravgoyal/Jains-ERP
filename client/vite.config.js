import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import dns from 'dns'

// DNS Override for environments where cms.jainscomputer.com or railway subdomains are blocked/refused by local router DNS
const originalLookup = dns.lookup;
dns.lookup = (hostname, options, callback) => {
  let cb = callback;
  let opt = options;
  if (typeof options === 'function') {
    cb = options;
    opt = {};
  }
  if (hostname === 'cms.jainscomputer.com') {
    if (opt.all) {
      return cb(null, [{ address: '69.46.46.112', family: 4 }]);
    }
    return cb(null, '69.46.46.112', 4);
  }
  return originalLookup(hostname, opt, cb);
};

const proxyTarget = process.env.VITE_API_TARGET || 'http://localhost:5000';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': {
        target: proxyTarget,
        changeOrigin: true,
        secure: false,
      },
      '/uploads': {
        target: proxyTarget,
        changeOrigin: true,
        secure: false,
      }
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (
              id.includes('node_modules/react/') || 
              id.includes('node_modules/react-dom/') || 
              id.includes('node_modules/scheduler/')
            ) {
              return 'vendor-react';
            }
            if (id.includes('lucide-react')) {
              return 'vendor-icons';
            }
            if (id.includes('recharts') || id.includes('d3')) {
              return 'vendor-charts';
            }
            if (id.includes('xlsx')) {
              return 'vendor-xlsx';
            }
            return 'vendor-others';
          }
        }
      }
    }
  }
})

