/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Allow service worker to be served from public folder
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Service-Worker-Allowed", value: "/" },
          { key: "Cache-Control", value: "no-cache" },
        ],
      },
    ];
  },
};
module.exports = nextConfig;
