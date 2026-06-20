/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Pin the workspace root to this project (a stray lockfile exists higher up)
  turbopack: {
    root: import.meta.dirname,
  },
};

export default nextConfig;
