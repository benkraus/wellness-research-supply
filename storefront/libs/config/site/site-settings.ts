import { SiteSettings } from '@libs/types';
import { config } from '@libs/util/server/config.server';

export const siteSettings: SiteSettings = {
  storefront_url: config.STOREFRONT_URL ?? 'https://storefront-production-3cb7.up.railway.app',
  description: '',
  favicon: '/favicon.svg',
  og_image: '/assets/brand/og-default.jpeg',
  og_image_alt: 'Wellness Research Supply clinical research vials',
  social_facebook: 'https://www.facebook.com/',
  social_instagram: 'https://www.instagram.com/',
  social_twitter: 'https://www.twitter.com/',
};
