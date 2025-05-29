// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    turbo: {},
    // Enable server actions
    serverActions: {
      allowedOrigins: ['localhost:9002', '127.0.0.1:65109', 'localhost:65109']
    },
    // Allow development origins
    allowedDevOrigins: [
      '127.0.0.1:65109',
      'localhost:65109',
      'localhost:9002'
    ]
  },
  // CORS headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, DELETE, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization, x-requested-with' },
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
        ],
      },
    ]
  },
  // API rewrites
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:9002/api/:path*',
      },
    ]
  },
  // Webpack configuration for development
  webpack: (config, { dev, isServer }) => {
    if (dev) {
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
        ignored: /node_modules/,
      };
    }
    
    // Handle Node.js modules that can't be resolved in browser
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        child_process: false,
        os: false,
        path: false,
        crypto: false,
        stream: false,
        util: false,
        net: false,
        tls: false,
        assert: false,
        debug: false,
        url: false,
        querystring: false,
        http: false,
        https: false,
        zlib: false,
        buffer: false,
      };
    }
    
    return config;
  },
  // Development settings
  env: {
    // Development environment variables can be added here
  },
}

// Export the config
module.exports = nextConfig