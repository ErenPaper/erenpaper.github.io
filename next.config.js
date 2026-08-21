/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  images: { unoptimized: true },
  // erenpaper.github.io is a user page served at the domain root, so no basePath.
};

module.exports = nextConfig;
