// Browser configuration (public values only). One place for limits and settings (D-022).
export const siteConfig = {
  backend: 'mock', // 'mock' or 'supabase' (Step 3)
  whatsappNumber: '447413069241', // TODO: confirm with owner that this is also her WhatsApp number
  currency: 'GBP',
  supabaseUrl: '',
  supabaseAnonKey: '',
  limits: {
    maxQtyPerItem: 10,
    maxLineItems: 20,
    nameMax: 80,
    phoneMax: 20,
    notesMax: 500,
    waLinkMax: 1800,
  },
  gatewayTimeoutMs: 8000,
  autoOpenDelayMs: 1500,
  mock: { orderNumber: 'SS-TEST-01', delayMs: 400 },
};
