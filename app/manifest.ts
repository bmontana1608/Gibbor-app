import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Master Club Manager',
    short_name: 'MCM',
    description: 'Gestión integral de escuelas deportivas',
    start_url: '/',
    display: 'standalone',
    background_color: '#020617',
    theme_color: '#06b6d4',
    icons: [
      {
        src: 'https://cdn-icons-png.flaticon.com/512/1162/1162815.png',
        sizes: 'any',
        type: 'image/png',
      },
    ],
  };
}
