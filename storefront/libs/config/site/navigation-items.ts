import { NavigationCollection, NavigationItemLocation } from '@libs/types';

export const headerNavigationItems: NavigationCollection = [
  {
    id: 1,
    label: 'Shop Peptides',
    url: '/products',
    sort_order: 0,
    location: NavigationItemLocation.header,
    new_tab: false,
  },
  {
    id: 3,
    label: 'Quality & Standards',
    url: '/about-us',
    sort_order: 1,
    location: NavigationItemLocation.header,
    new_tab: false,
  },
  {
    id: 4,
    label: 'COA Lookup',
    url: '/coa',
    sort_order: 2,
    location: NavigationItemLocation.header,
    new_tab: false,
  },
];

export const footerNavigationItems: NavigationCollection = [
  {
    id: 1,
    label: 'Products',
    url: '/products',
    location: NavigationItemLocation.footer,
    sort_order: 1,
    new_tab: false,
  },
  {
    id: 2,
    label: 'Quality & Standards',
    url: '/about-us',
    location: NavigationItemLocation.footer,
    sort_order: 1,
    new_tab: false,
  },
  {
    id: 3,
    label: 'COA Lookup',
    url: '/coa',
    location: NavigationItemLocation.footer,
    sort_order: 2,
    new_tab: false,
  },
];
