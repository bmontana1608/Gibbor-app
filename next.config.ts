import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Habilitamos los subdominios locales para pruebas Multiclub */
  // @ts-ignore
  allowedDevOrigins: ['*.lvh.me', 'localhost:3000', 'millonarios.lvh.me'],
  async redirects() {
    return [
      {
        source: '/unete-gibbor',
        destination: '/gibbor/unete',
        permanent: true,
      },
      {
        source: '/:tenant/unete-gibbor',
        destination: '/:tenant/unete',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
