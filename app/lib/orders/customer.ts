import type { OrderCustomer, UserProfile } from '@/types/orders';

// One canonical view for review and the server-side comparison. Notes belong to the draft.
export function customerFromProfile(profile: UserProfile): OrderCustomer {
  const same = profile.shipping_same_as_billing !== false;
  const address = profile.billing_address || profile.address || '';
  const city = profile.billing_city || profile.city || '';
  const postal = profile.billing_postal_code || profile.postal_code || '';
  const country = profile.billing_country || 'Česká republika';
  return {
    name: profile.full_name || '', email: profile.email || '', phone: profile.phone || '',
    company: profile.company || '', companyId: profile.company_id || '', vatId: profile.vat_id || '',
    billingAddress: address, billingCity: city, billingPostalCode: postal, billingCountry: country,
    shippingCompany: same ? profile.company || '' : profile.shipping_company || '',
    shippingContactName: same ? profile.full_name || '' : profile.shipping_contact_name || '',
    shippingAddress: same ? address : profile.shipping_address || '',
    shippingCity: same ? city : profile.shipping_city || '',
    shippingPostalCode: same ? postal : profile.shipping_postal_code || '',
    shippingCountry: same ? country : profile.shipping_country || country,
    deliveryInstructions: profile.delivery_instructions || '',
  };
}

export function sameCustomer(a: OrderCustomer, b: OrderCustomer) {
  const keys = Object.keys(a).filter(key => key !== 'note') as Array<keyof OrderCustomer>;
  return keys.length > 0 && keys.every(key => (a[key] || '') === (b[key] || '')) &&
    Object.keys(b).filter(key => key !== 'note').every(key => (a[key as keyof OrderCustomer] || '') === (b[key as keyof OrderCustomer] || ''));
}

export class CustomerChangedError extends Error {
  constructor(public customer: OrderCustomer) { super('Kontaktní nebo dodací údaje se změnily. Zkontrolujte aktualizované údaje a objednávku odešlete znovu.'); }
}
