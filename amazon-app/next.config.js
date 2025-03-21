/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  webpack: (config) => {
    // Add support for CSS files in node_modules
    const rules = config.module.rules
      .find((rule) => typeof rule.oneOf === 'object')
      .oneOf.filter((rule) => Array.isArray(rule.use));

    rules.forEach((rule) => {
      rule.use.forEach((moduleLoader) => {
        if (
          moduleLoader.loader?.includes('css-loader') &&
          !moduleLoader.loader?.includes('postcss-loader')
        ) {
          if (moduleLoader.options.modules) {
            moduleLoader.options.modules.auto = (resourcePath) => !resourcePath.includes('node_modules');
          }
        }
      });
    });

    return config;
  }
};

module.exports = nextConfig;