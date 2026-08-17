import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Permitir que el preview de Devin (127.0.0.1) acceda a recursos de dev.
  allowedDevOrigins: ["127.0.0.1", "http://127.0.0.1:55117"],
};

export default nextConfig;
