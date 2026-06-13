import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const appDir = dirname(fileURLToPath(import.meta.url));
const backendUrl = (process.env.BACKEND_URL || 'http://localhost:8080').replace(/\/+$/, '');
const backendImageUrl = new URL(backendUrl);

/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    root: appDir,
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
      {
        source: '/uploads/:path*',
        destination: `${backendUrl}/uploads/:path*`,
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: backendImageUrl.protocol.replace(':', ''),
        hostname: backendImageUrl.hostname,
        port: backendImageUrl.port,
        pathname: '/uploads/**',
      },
    ],
  },
};

export default nextConfig;
