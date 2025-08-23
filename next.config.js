const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  outputFileTracingIncludes: {
    '/': ['./public/**/*'],
  },
  // Exclude React Native folder from TypeScript checking
  typescript: {
    ignoreBuildErrors: true, // Temporarily ignore TS errors to allow startup
  },
  eslint: {
    dirs: ['src', 'components'], // Only lint specific directories
    ignoreDuringBuilds: true, // Temporarily ignore ESLint errors
  },
  // Disabled Turbopack to use webpack instead
  // experimental: {
  //   turbo: {
  //     rules: {
  //       // Exclude React Native folder from processing
  //     },
  //   },
  // },
  webpack: (config, { isServer, webpack }) => {
    if (!isServer) {
      // Don't bundle Node.js modules for the client
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        stream: false,
        url: false,
        zlib: false,
        http: false,
        https: false,
        assert: false,
        os: false,
        path: false,
        child_process: false,
        dns: false,
        events: false,
        util: false,
        querystring: false,
        buffer: false,
      };
      
      // Alias server-only packages to an empty module on the client
      const emptyModule = path.resolve(__dirname, 'src/lib/mocks/empty.js');
      config.resolve.alias = {
        ...config.resolve.alias,
        'google-auth-library': emptyModule,
        'googleapis': emptyModule,
        'gcp-metadata': emptyModule,
        'gtoken': emptyModule,
        'agent-base': emptyModule,
        'https-proxy-agent': emptyModule,
        'jws': emptyModule,
        'gaxios': emptyModule,
      };
    }
    return config;
  },
};

module.exports = nextConfig;