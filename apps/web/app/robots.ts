import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const production = process.env.NODE_ENV === 'production';
  return {
    rules: {
      userAgent: '*',
      allow: production ? '/' : '/',
    },
    sitemap: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/sitemap.xml`
  };
}
