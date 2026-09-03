export type AIQuotaMode = 'limited' | 'unlimited' | 'disabled';

export interface AIFeatureDefinition {
  key: string;
  displayName: string;
  description: string;
  category: string;
  sourceEndpoint: string;
  defaultEnabled: boolean;
  defaultRoleQuotas: Record<string, number | AIQuotaMode>;
  quotaPeriod: 'daily' | 'monthly' | 'none';
  supportsExpiration: boolean;
  supportsUserOverride: boolean;
  isPublic: boolean;
}

export const AI_FEATURE_REGISTRY: Record<string, AIFeatureDefinition> = {
  'property.parse': {
    key: 'property.parse',
    displayName: 'Parse Listing Text',
    description: 'Extract property details from raw text to auto-fill the form.',
    category: 'Property',
    sourceEndpoint: '/api/parse-listing',
    defaultEnabled: true,
    defaultRoleQuotas: {
      agent: 5,
      admin: 'unlimited',
      super_admin: 'unlimited',
    },
    quotaPeriod: 'daily',
    supportsExpiration: true,
    supportsUserOverride: true,
    isPublic: false,
  },
  'property.description': {
    key: 'property.description',
    displayName: 'Generate Description',
    description: 'Generate engaging property descriptions.',
    category: 'Property',
    sourceEndpoint: '/api/ai/generate',
    defaultEnabled: true,
    defaultRoleQuotas: {
      agent: 5,
      admin: 'unlimited',
      super_admin: 'unlimited',
    },
    quotaPeriod: 'daily',
    supportsExpiration: true,
    supportsUserOverride: true,
    isPublic: false,
  },
  'property.title': {
    key: 'property.title',
    displayName: 'Generate Title',
    description: 'Generate catchy property titles.',
    category: 'Property',
    sourceEndpoint: '/api/ai/generate',
    defaultEnabled: true,
    defaultRoleQuotas: {
      agent: 5,
      admin: 'unlimited',
      super_admin: 'unlimited',
    },
    quotaPeriod: 'daily',
    supportsExpiration: true,
    supportsUserOverride: true,
    isPublic: false,
  },
  'property.features': {
    key: 'property.features',
    displayName: 'Extract Features',
    description: 'Extract structured facilities and features.',
    category: 'Property',
    sourceEndpoint: '/api/ai/generate',
    defaultEnabled: true,
    defaultRoleQuotas: {
      agent: 5,
      admin: 'unlimited',
      super_admin: 'unlimited',
    },
    quotaPeriod: 'daily',
    supportsExpiration: true,
    supportsUserOverride: true,
    isPublic: false,
  },
  'crm.followup': {
    key: 'crm.followup',
    displayName: 'Generate Follow-up',
    description: 'Generate WhatsApp follow-up messages for leads.',
    category: 'CRM',
    sourceEndpoint: '/api/ai/followup',
    defaultEnabled: true,
    defaultRoleQuotas: {
      agent: 5,
      admin: 'unlimited',
      super_admin: 'unlimited',
    },
    quotaPeriod: 'daily',
    supportsExpiration: true,
    supportsUserOverride: true,
    isPublic: false,
  },
  'finance.scan_invoice': {
    key: 'finance.scan_invoice',
    displayName: 'Scan Invoice',
    description: 'Extract data from invoice documents via Vision AI.',
    category: 'Finance',
    sourceEndpoint: '/api/ai/scan-invoice',
    defaultEnabled: true,
    defaultRoleQuotas: {
      agent: 5,
      admin: 'unlimited',
      super_admin: 'unlimited',
    },
    quotaPeriod: 'daily',
    supportsExpiration: true,
    supportsUserOverride: true,
    isPublic: false,
  },
  'executive.summary': {
    key: 'executive.summary',
    displayName: 'Executive Summary',
    description: 'Generate business performance summaries.',
    category: 'Executive',
    sourceEndpoint: '/api/dashboard/summary',
    defaultEnabled: true,
    defaultRoleQuotas: {
      agent: 'disabled',
      admin: 'unlimited',
      super_admin: 'unlimited',
      commissioner: 'unlimited',
    },
    quotaPeriod: 'daily',
    supportsExpiration: true,
    supportsUserOverride: true,
    isPublic: false,
  },
  'support.chat': {
    key: 'support.chat',
    displayName: 'Public Support Chat',
    description: 'Public-facing AI chatbot for inquiries.',
    category: 'Public',
    sourceEndpoint: '/api/chat',
    defaultEnabled: true,
    defaultRoleQuotas: {
      anon: 15,
      viewer: 15,
      agent: 15,
      marketing: 15,
      admin: 50,
      super_admin: 100,
    },
    quotaPeriod: 'daily',
    supportsExpiration: false,
    supportsUserOverride: false,
    isPublic: true,
  },
};
