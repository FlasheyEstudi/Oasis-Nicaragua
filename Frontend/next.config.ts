import type { NextConfig } from "next";
import os from 'os';

// Backend URL for server-side proxy (never exposed to browser)
const BACKEND_URL = process.env.INTERNAL_BACKEND_URL || 'http://localhost:8000';

// Dynamically collect all local network adapter IPs to allow Hot Module Replacement (HMR) from external devices
function getLocalIPs(): string[] {
  const ips: string[] = ['localhost', '127.0.0.1', '0.0.0.0'];
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    const netInterfaces = interfaces[name];
    if (netInterfaces) {
      for (const iface of netInterfaces) {
        if (iface.family === 'IPv4') {
          ips.push(iface.address);
        }
      }
    }
  }
  return ips;
}

const isProd = process.env.NODE_ENV === 'production';

const nextConfig: NextConfig = {
  compress: true,
  images: {
    unoptimized: true,
  },
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(self), microphone=(self), geolocation=(self)'
          },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://www.gstatic.com https://apis.google.com https://unpkg.com blob:; worker-src 'self' blob:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://unpkg.com; img-src 'self' data: https: blob:; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self' http: https: ws: wss:; frame-src 'self' https://*.firebaseapp.com https://*.firebase.com; frame-ancestors 'self';"
          }
        ]
      }
    ];
  },
  // Proxy API, Socket.io, and Uploads calls server-side → eliminates mixed content on HTTPS tunnels
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: `${BACKEND_URL}/api/v1/:path*`,
      },
      {
        source: '/socket.io/:path*',
        destination: `${BACKEND_URL}/socket.io/:path*`,
      },
      {
        source: '/uploads/:path*',
        destination: `${BACKEND_URL}/uploads/:path*`,
      },
    ];
  },
  // @ts-ignore - Next.js 15+ dev origins
  allowedDevOrigins: [
    ...getLocalIPs(),
    // Tunnel domains for mobile testing (localtunnel, ngrok, cloudflared)
    '*.loca.lt',
    '*.ngrok.io',
    '*.ngrok-free.app',
    '*.trycloudflare.com',
  ],
};

export default nextConfig;
