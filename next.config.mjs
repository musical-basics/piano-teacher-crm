/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    // This "Guest List" tells Next.js it's safe to load images from these places
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'flpbvurtkdnluyoqqtgn.supabase.co', // Your NEW Supabase Project
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'difcwmsemzihuilyipz.supabase.co', // Your OLD Supabase Project (Just in case)
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'i.ytimg.com', // YouTube Thumbnails
        port: '',
        pathname: '/**',
      },
    ],
  },

  // Rewrites for cleaner URLs
  async rewrites() {
    return [
      {
        source: '/',
        destination: '/u/lionelyu', // Loads your profile at the root domain
      },
      {
        source: '/:username/story',
        destination: '/u/:username/story',
      },
      {
        source: '/:username((?!admin|login|signup|api|_next|u|favicon).*)',
        destination: '/u/:username',
      },
    ];
  },
};

export default nextConfig;