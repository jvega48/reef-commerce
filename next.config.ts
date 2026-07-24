import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdfkit ships .afm font metrics that must load from node_modules at
  // runtime; sharp is a native binary — keep both out of the server bundle.
  serverExternalPackages: ["pdfkit", "sharp"],
  experimental: {
    serverActions: {
      // Server Actions default to a 1 MB request body, which silently rejects
      // essentially every real product photo (phone shots are 3–12 MB) — the
      // cause of "image upload doesn't work". Sized for a multi-file drop;
      // per-file limits are enforced in src/lib/image-processing.ts.
      bodySizeLimit: "150mb",
    },
  },
  images: {
    remotePatterns: [
      // Product photos still hosted on the Shopify CDN (migrated catalog).
      { protocol: "https", hostname: "cdn.shopify.com" },
      // Cloudflare R2 public bucket (production uploads).
      ...(process.env.R2_PUBLIC_URL
        ? [
            {
              protocol: "https" as const,
              hostname: new URL(process.env.R2_PUBLIC_URL).hostname,
            },
          ]
        : []),
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
