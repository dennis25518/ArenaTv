export interface PaymentMethod {
  id: string;
  type: 'Card' | 'Mobile Money';
  provider: string;
  last4: string;
  expiry: string;
  isPrimary?: boolean;
  holderName?: string;
}

export interface User {
  name: string;
  email: string;
  avatar: string;
  isPremium: boolean;
}

export interface Plan {
  id: string;
  name: string;
  price: string;
  features: string[];
}