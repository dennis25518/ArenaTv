import { Plan } from '../types';

export const plans: Plan[] = [
  {
    id: 'monthly',
    name: 'Premium Monthly',
    price: '1.99',
    features: [
      'Unlimited live streaming',
      '4K UHD & 60fps channels',
      'Ad-free experience',
      'Full DVR replays',
      'Cast to Smart TV & devices',
    ],
  },
  {
    id: 'yearly',
    name: 'Premium Yearly',
    price: '19.99',
    features: [
      'All monthly features included',
      'Save 20% compared to monthly',
      'Priority high-bandwidth feeds',
      'Custom M3U playlist export',
      'VIP channel access',
    ],
  },
];