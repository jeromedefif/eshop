/** @type {import('next').NextConfig} */
const path = require('path');
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true
  },
  typescript: {
    // Ignore build errors from Supabase functions
    ignoreBuildErrors: true
  },
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname, './app')
    }
    // Ignorování Supabase funkcí
    config.module.rules.push({
      test: /supabase\/functions/,
      use: 'ignore-loader'
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
  }
}

module.exports = nextConfig
