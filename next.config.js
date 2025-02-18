/** @type {import('next').NextConfig} */
const path = require('path');

const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true  // Dočasně ignorovat ESLint chyby během buildu
  },
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Zachování původního aliasu
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname, './app')
    }

    // Přidání ignore pravidla pro Supabase funkce
    config.module.rules.push({
      test: /supabase\/functions/,
      loader: 'ignore-loader',
    });

    return config
  },
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,DELETE,PATCH,POST,PUT' },
          { key: 'Access-Control-Allow-Headers', value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version' },
        ]
      }
    ]
  },
  experimental: {
    serverActions: true
  }
}

module.exports = nextConfig
