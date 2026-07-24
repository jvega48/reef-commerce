import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdfkit ships .afm font metrics that must load from node_modules at
  // runtime — keep it out of the server bundle.
  serverExternalPackages: ["pdfkit"],
  images: {
    remotePatterns: [
      // Product photos still hosted on the Shopify CDN (migrated catalog).
      { protocol: "https", hostname: "cdn.shopify.com" },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
