/** @type {import('next').NextConfig} */
module.exports = {
  output: "standalone",
  experimental: {},
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
};
