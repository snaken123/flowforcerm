// Set timezone globally for all server-side code — app is Philippines-only
process.env.TZ = "Asia/Manila";

const withPWA = require("next-pwa")({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { nextRuntime }) => {
    // next-auth pulls in openid-client (a Node-only OAuth library used for the
    // Google provider's sign-in flow) even into the Edge Runtime bundle that
    // middleware.ts uses for getToken() — which never needs it, since getToken
    // only decodes an already-issued JWT session cookie. openid-client references
    // __dirname internally, which doesn't exist on Edge, crashing every request
    // at module-load time. Stub it out of the edge build specifically; the Node
    // runtime (route handlers, the actual NextAuth OAuth callback) keeps it.
    if (nextRuntime === "edge") {
      config.resolve.alias = {
        ...config.resolve.alias,
        "openid-client": false,
      };
    }
    return config;
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https://*.uploadthing.com https://utfs.io https://lh3.googleusercontent.com https://avatars.githubusercontent.com",
              "connect-src 'self'",
              "frame-ancestors 'none'",
            ].join("; "),
          },
        ],
      },
    ];
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.uploadthing.com" },
      { protocol: "https", hostname: "utfs.io" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
    ],
  },
};

module.exports = withPWA(nextConfig);
