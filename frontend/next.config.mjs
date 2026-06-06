/** @type {import('next').NextConfig} */
const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
let remoteHost = 'localhost';
let remoteProtocol = 'http';
let remotePort = '8080';

try {
  const url = new URL(apiBase);
  remoteHost = url.hostname;
  remoteProtocol = url.protocol.replace(':', '');
  remotePort = url.port;
} catch (e) {
  // Use fallback values if invalid URL
}

const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: remoteProtocol,
        hostname: remoteHost,
        port: remotePort || undefined,
        pathname: '/uploads/**',
      },
    ],
  },
};

export default nextConfig;
