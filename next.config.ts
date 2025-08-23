import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },

    ],
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Prevent these Node.js specific modules from being bundled on the client.
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        child_process: false,
        os: false,
        net: false, 
        tls: false,
      };
    }
    return config;
  },
};

export default nextConfig;
