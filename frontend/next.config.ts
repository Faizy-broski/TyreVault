import type { NextConfig } from 'next'
import path from 'path'

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      // Supabase Storage — direct (dev / fallback)
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      // AWS CloudFront CDN — production image delivery
      {
        protocol: 'https',
        hostname: process.env.NEXT_PUBLIC_CDN_URL
          ? new URL(process.env.NEXT_PUBLIC_CDN_URL).hostname
          : '*.cloudfront.net',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      // Tyres Addict CDN — product tyre images
      {
        protocol: 'https',
        hostname: 'cdn.tyresaddict.com',
        pathname: '/tyres/**',
      },
    ],
  },

  // Strict mode catches subtle React bugs early
  reactStrictMode: true,

  // Standalone output for Docker / EC2 deployment if needed
  // output: 'standalone',
}

export default nextConfig
