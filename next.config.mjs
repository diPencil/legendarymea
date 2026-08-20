/** @type {import('next').NextConfig} */
const isStaticExport = process.env.STATIC_EXPORT === 'true';

const nextConfig = {
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
