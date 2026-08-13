import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
    return {
        rules: {
            userAgent: '*',
            allow: ['/', '/produkty/'],
            disallow: [
                '/admin/',
                '/api/',
                '/auth/',
                '/login',
                '/register',
                '/forgot-password',
                '/reset-password',
                '/my-orders',
                '/my-profile',
                '/order-summary',
                '/order-confirmation'
            ]
        },
        sitemap: 'https://www.beginy.cz/sitemap.xml',
        host: 'https://www.beginy.cz'
    };
}
