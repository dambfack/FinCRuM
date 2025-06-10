/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  outputFileTracingIncludes: {
    '/': ['./public/**/*'],
  },
  // Exclude React Native folder from TypeScript checking
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    dirs: ['src', 'components'], // Only lint specific directories
    ignoreDuringBuilds: false,
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Configure node polyfills for google-auth-library compatibility
      config.node = {
        ...config.node,
        __dirname: true,
        __filename: true,
        global: true,
      };
      
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        child_process: false,
        os: false,
        http2: false,
        events: false,
        util: false,
        stream: false,
        buffer: false,
        crypto: false,
        path: false,
        url: false,
        querystring: false,
        assert: false,
        zlib: false,
        // Add specific aliases for node: scheme imports
        'node:events': false,
        'node:buffer': false,
        'node:util': false,
        'node:stream': false,
        'node:crypto': false,
        'node:path': false,
        'node:url': false,
        'node:querystring': false,
        'node:assert': false,
        'node:zlib': false,
        'node:fs': false,
        'node:os': false,
        'node:http2': false,
        'node:net': false,
        'node:tls': false,
        'node:child_process': false,
      };
    }
    
    // Exclude React Native folder from webpack processing
    config.module.rules.push({
      test: /\.(js|jsx|ts|tsx)$/,
      exclude: /fincrm-android/,
    });
    
    return config;
  },
};

module.exports = nextConfig;