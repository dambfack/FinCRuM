/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    outputFileTracingIncludes: {
      '/': ['./public/**/*'],
    },
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
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
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