/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: 'http', hostname: 'localhost' },
      // { protocol: 'https', hostname: 'your-cdn.example.com' },
    ],
  },
};
module.exports = nextConfig;
