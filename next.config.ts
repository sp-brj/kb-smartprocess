import type { NextConfig } from "next";

// Базовые security-заголовки. CSP намеренно не задаём — её легко сломать
// (inline-стили, Cloudinary, highlight.js) без тестового прогона; здесь только
// безопасные заголовки, не рискующие поведением. HSTS без includeSubDomains,
// чтобы не навязывать HTTPS соседним поддоменам smartprocess.ru.
const securityHeaders = [
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Strict-Transport-Security", value: "max-age=31536000" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
