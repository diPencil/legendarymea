/** @type {import('next').NextConfig} */
const isStaticExport = process.env.STATIC_EXPORT === 'true';

const nextConfig = {
  distDir: process.env.NEXT_DIST_DIR || '.next',
  ...(isStaticExport ? {
    output: 'export',
    trailingSlash: true,
    images: {
      unoptimized: true,
    },
  } : {
    async redirects() {
      return [
        {
          source: '/careers',
          destination: '/taxidia',
          permanent: true,
        },
      ]
    },
  }),
}

export default nextConfig
