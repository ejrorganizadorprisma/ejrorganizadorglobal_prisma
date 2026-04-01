import { z } from 'zod';

export interface DocumentSettings {
  id: string;

  // Profile Information
  profileName: string;
  isDefault: boolean;

  // Company Branding
  companyLogo?: string;
  companyName?: string;

  // Footer Information
  footerText?: string;
  footerAddress?: string;
  footerPhone?: string;
  footerEmail?: string;
  footerWebsite?: string;

  // Signature Settings
  signatureImage?: string;
  signatureName?: string;
  signatureRole?: string;

  // Quote Defaults
  defaultQuoteValidityDays: number;

  // Additional Customization
  primaryColor: string;
  secondaryColor: string;

  // Metadata
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
}

const hexColorRegex = /^#[0-9A-Fa-f]{6}$/;

export const CreateDocumentSettingsSchema = z.object({
  profileName: z.string().min(1, 'Nome do perfil é obrigatório').max(255),
  isDefault: z.boolean().default(false),

  companyLogo: z.string().optional(),
  companyName: z.string().max(255).optional(),

  footerText: z.string().optional(),
  footerAddress: z.string().optional(),
  footerPhone: z.string().max(50).optional(),
  footerEmail: z.string().email('Email inválido').optional().or(z.literal('')),
  footerWebsite: z.string().max(255).optional(),

  signatureImage: z.string().optional(),
  signatureName: z.string().max(255).optional(),
  signatureRole: z.string().max(100).optional(),

  defaultQuoteValidityDays: z.number().int().positive('Validade deve ser maior que zero').default(30),

  primaryColor: z.string().regex(hexColorRegex, 'Cor primária deve ser um código hexadecimal válido (#RRGGBB)').default('#2563eb'),
  secondaryColor: z.string().regex(hexColorRegex, 'Cor secundária deve ser um código hexadecimal válido (#RRGGBB)').default('#1e40af'),

  createdBy: z.string().optional(),
});

export const UpdateDocumentSettingsSchema = z.object({
  profileName: z.string().min(1).max(255).optional(),
  isDefault: z.boolean().optional(),

  companyLogo: z.string().optional().nullable(),
  companyName: z.string().max(255).optional().nullable(),

  footerText: z.string().optional().nullable(),
  footerAddress: z.string().optional().nullable(),
  footerPhone: z.string().max(50).optional().nullable(),
  footerEmail: z.string().email('Email inválido').optional().nullable().or(z.literal('')),
  footerWebsite: z.string().max(255).optional().nullable(),

  signatureImage: z.string().optional().nullable(),
  signatureName: z.string().max(255).optional().nullable(),
  signatureRole: z.string().max(100).optional().nullable(),

  defaultQuoteValidityDays: z.number().int().positive().optional(),

  primaryColor: z.string().regex(hexColorRegex).optional(),
  secondaryColor: z.string().regex(hexColorRegex).optional(),
});

export type CreateDocumentSettingsDTO = z.infer<typeof CreateDocumentSettingsSchema>;
export type UpdateDocumentSettingsDTO = z.infer<typeof UpdateDocumentSettingsSchema>;
