import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {},
  webpack: (config, { dev, isServer }) => {
    // Explicitly scope Webpack context to the project root directory
    config.context = path.resolve(__dirname);

    // Watcher configuration preventing Watchpack EACCES permission errors on Termux/Android
    config.watchOptions = {
      ...config.watchOptions,
      followSymlinks: false,
      ignored: [
        '**/node_modules/**',
        '**/.git/**',
        '**/.next/**',
        '**/uploads/**',
        '/data/**',
        '/data/data/**',
      ],
    };

    // Fix Webpack dependency snapshot cache errors on Termux
    if (dev && config.snapshot) {
      config.snapshot = {
        ...config.snapshot,
        managedPaths: [],
        immutablePaths: [],
      };
    }

    return config;
  },
};

export default nextConfig;
