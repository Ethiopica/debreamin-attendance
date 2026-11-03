/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["@pdf-lib/fontkit", "nodemailer"],
  outputFileTracingIncludes: {
    "/api/report": ["./public/fonts/**/*"],
  },
};

export default nextConfig;
