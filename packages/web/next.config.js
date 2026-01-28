/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Removed 'output: export' to enable API routes
  images: {
    unoptimized: true,
  },
};

module.exports = nextConfig;