import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    'localhost',
    '127.0.0.1',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'https://filips-macbook-pro.tailcbed31.ts.net',
    'https://filips-macbook-pro.tailcbed31.ts.net:3000',
    'http://filips-macbook-pro.tailcbed31.ts.net',
    'http://filips-macbook-pro.tailcbed31.ts.net:3000',
    'filips-macbook-pro.tailcbed31.ts.net',
      'filips-a35.tailcbed31.ts.net'
  ],
};

export default nextConfig;
