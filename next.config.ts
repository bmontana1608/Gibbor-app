import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Habilitamos los subdominios locales para pruebas Multiclub */
  // @ts-ignore
  allowedDevOrigins: ['*.lvh.me', 'localhost:3000', 'millonarios.lvh.me']
};

export default nextConfig;
