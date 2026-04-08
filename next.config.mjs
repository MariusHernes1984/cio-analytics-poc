/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // Allow bigger payloads on server actions for research-material uploads
    serverActions: {
      bodySizeLimit: "25mb",
    },
  },
  // Streaming LLM responses need long timeouts; App Service Linux default is fine
  // but we bump the default page size limit for large research uploads.
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [{ key: "Cache-Control", value: "no-store" }],
      },
    ];
  },
};

export default nextConfig;
