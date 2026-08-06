// Set timezone globally for all server-side code — app is Philippines-only
process.env.TZ = "Asia/Manila";

// Temporarily disabled everywhere (was previously only disabled in development) --
// next-pwa's webpack plugin is a suspected cause of a "__dirname is not defined"
// crash in every request on Vercel's Edge Runtime that survived two other targeted
// fixes. PWA/offline support isn't essential to the app functioning; re-enable once
// this is confirmed as the actual cause and a working combination is found (e.g.
// the maintained @ducanh2912/next-pwa fork, or explicitly excluding it from the
// edge compilation pass).
const withPWA = require("next-pwa")({
  dest: "public",
  disable: true,
  register: true,
  skipWaiting: true,
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { webpack, nextRuntime }) => {
    // Something in middleware's dependency graph references __dirname at module
    // load time, which doesn't exist on Vercel's actual Edge Runtime (only
    // reproduces in production, not in local dev/build's more lenient edge
    // simulation) -- crashing every single request before any route logic runs.
    // Rather than chase down the exact offending module, have webpack substitute
    // __dirname/__filename with literal values at build time for the edge
    // compilation, so no runtime reference to the undefined global survives.
    if (nextRuntime === "edge") {
      config.plugins.push(
        new webpack.DefinePlugin({
          __dirname: JSON.stringify("/"),
          __filename: JSON.stringify("/index.js"),
        })
      );
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
