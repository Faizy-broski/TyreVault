import { z } from 'zod'

// ── Variant row ────────────────────────────────────────────────────────────
export const variantSchema = z.object({
  sku:            z.string().min(1, 'SKU is required'),
  tyreSizeDisplay: z.string().min(1, 'Tyre size is required'),
  width:          z.number().optional(),
  profile:        z.number().optional(),
  rimSize:        z.number({ error: 'Rim size is required' }),
  constructionType: z.string().optional(),
  speedRating:    z.string().optional(),
  loadIndex:      z.string().optional(),
  fuelRating:     z.string().optional(),
  wetGrip:        z.string().optional(),
  noiseDb:        z.string().optional(),
  noiseClass:     z.string().optional(),
  runflat:        z.boolean().default(false),
  xlReinforced:   z.boolean().default(false),
  plyRating:      z.string().optional(),
  loadRange:      z.string().optional(),
  countryOfOrigin: z.string().optional(),
  variantImages:  z.array(z.string()).default([]),
})

// ── Pricing row (parallel to variant, same index) ─────────────────────────
export const pricingSchema = z.object({
  priceIncGst:   z.number({ error: 'Price is required' }).min(0),
  compareAtPrice: z.number().optional(),
  costPrice:     z.number().optional(),
  inventory:     z.number().min(0).default(0),
  lowStockAlert: z.number().min(0).default(10),
  warehouseId:   z.string().optional(),
})

// ── FAQ item ───────────────────────────────────────────────────────────────
export const faqItemSchema = z.object({
  question: z.string(),
  answer:   z.string(),
})

// ── Full product form ──────────────────────────────────────────────────────
export const createProductSchema = z.object({
  // Tab 1: Basic Info
  brandId:           z.string().min(1, 'Brand is required'),
  patternName:       z.string().min(1, 'Title is required'),
  patternSlug:       z.string().min(1, 'Slug is required').regex(/^[a-z0-9-]+$/, 'Lowercase letters, numbers and hyphens only'),
  shortDescription:  z.string().optional(),
  galleryImages:     z.array(z.string()).default([]),
  tyreOverview:      z.string().optional(),
  features:          z.string().optional(),
  warrantyInformation: z.string().optional(),
  tyreSpecSheet:     z.string().optional(),
  faqList:           z.array(faqItemSchema).default([]),

  // Tab 2: Categories
  discountable:      z.boolean().default(true),
  applicationType:   z.enum(['PCR', '4x4', 'TBR']).default('PCR'),
  categoryIds:       z.array(z.string()).default([]),
  performanceCategory: z.string().optional(),
  seasonType:        z.string().optional(),
  collectionId:      z.string().optional(),
  tags:              z.array(z.string()).default([]),

  // Tab 3: Variants
  variants: z.array(variantSchema).min(1, 'Add at least one variant'),

  // Tab 4: Pricing & Inventory (parallel array)
  pricing: z.array(pricingSchema).default([]),
})

export type CreateProductFormValues = z.infer<typeof createProductSchema>
export type VariantFormValues      = z.infer<typeof variantSchema>
export type PricingFormValues      = z.infer<typeof pricingSchema>
export type FaqItem                = z.infer<typeof faqItemSchema>
