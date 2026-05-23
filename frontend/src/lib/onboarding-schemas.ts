import { z } from 'zod'

// ── Email regex (rejects abc@, @gmail.com, test@.com etc.) ────────────────────

const EMAIL_RE = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/

// ── Helpers (also exported for UI logic) ─────────────────────────────────────

export function normalizePhone(value: string) {
  return value.replace(/\s+/g, '')
}

export function normalizeBusinessNumber(value: string) {
  return value.replace(/[\s-]/g, '')
}

export function isValidAusMobile(value: string) {
  return /^04\d{8}$/.test(normalizePhone(value))
}

export function isValidBusinessNumber(value: string) {
  const n = normalizeBusinessNumber(value)
  return /^\d{11}$/.test(n) || /^\d{9}$/.test(n)
}

// ── Sub-schema ────────────────────────────────────────────────────────────────

const workingHourSchema = z.object({
  day:       z.string(),
  label:     z.string(),
  isClosed:  z.boolean(),
  openTime:  z.string(),
  closeTime: z.string(),
})

// ── Full onboarding schema ────────────────────────────────────────────────────

export const onboardingSchema = z
  .object({
    // Step 1
    fullName: z
      .string()
      .min(1, 'Full name is required')
      .max(100, 'Full name must be 100 characters or fewer'),
    email: z
      .string()
      .min(1, 'Email is required')
      .refine(v => EMAIL_RE.test(v.trim()), 'Please enter a valid email address'),

    // Step 2
    contactPerson: z
      .string()
      .max(100, 'Contact name must be 100 characters or fewer'),
    contactEmail: z
      .string()
      .refine(
        v => v === '' || EMAIL_RE.test(v.trim()),
        'Please enter a valid email address',
      ),
    address: z
      .string()
      .min(5, 'Please enter a valid address (at least 5 characters)')
      .max(255, 'Address must be 255 characters or fewer'),
    addressConfirmed:  z.boolean(),
    mobileNumber: z
      .string()
      .min(1, 'Mobile number is required')
      .refine(isValidAusMobile, 'Please enter a valid Australian mobile (e.g. 0412 345 678)'),
    mobileConfirmed:   z.boolean(),
    businessNumber: z
      .string()
      .min(1, 'Business number is required')
      .refine(isValidBusinessNumber, 'Please enter a valid ABN (11 digits) or ACN (9 digits)'),
    businessConfirmed: z.boolean(),

    // Step 3
    fitsPassengerSuv:        z.boolean().nullable(),
    fitsWheelPackages:       z.boolean().nullable(),
    fitsTruck:               z.boolean().nullable(),
    wheelAlignmentAvailable: z.boolean(),
    wheelAlignmentPrice:     z.string(),
    mobileFittingAvailable:  z.boolean(),
    workingHours:            z.array(workingHourSchema),
  })
  .superRefine((data, ctx) => {
    // ── Confirmation checks ───────────────────────────────────────────────────
    const addrOk = data.address.trim().length >= 5
    const mobileOk = isValidAusMobile(data.mobileNumber)
    const bizOk = isValidBusinessNumber(data.businessNumber)

    if (addrOk && !data.addressConfirmed) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Please confirm your address',
        path: ['addressConfirmed'],
      })
    }
    if (mobileOk && !data.mobileConfirmed) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Please confirm your mobile number',
        path: ['mobileConfirmed'],
      })
    }
    if (bizOk && !data.businessConfirmed) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Please confirm your business number',
        path: ['businessConfirmed'],
      })
    }

    // ── At least one fitting option answered ──────────────────────────────────
    if (
      data.fitsPassengerSuv === null &&
      data.fitsWheelPackages === null &&
      data.fitsTruck === null
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Please answer at least one fitting option',
        path: ['fitsPassengerSuv'],
      })
    }

    // ── Wheel alignment price required when enabled ───────────────────────────
    if (data.wheelAlignmentAvailable) {
      const price = parseFloat(data.wheelAlignmentPrice)
      if (!data.wheelAlignmentPrice || isNaN(price) || price <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Please enter a valid price greater than 0',
          path: ['wheelAlignmentPrice'],
        })
      }
    }

    // ── Open time must be before close time ───────────────────────────────────
    data.workingHours.forEach((h, i) => {
      if (!h.isClosed && h.openTime >= h.closeTime) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Open time must be earlier than close time',
          path: ['workingHours', i, 'closeTime'],
        })
      }
    })
  })

export type OnboardingFormData = z.infer<typeof onboardingSchema>

// ── Step field lists (used for per-step trigger) ──────────────────────────────

export const STEP1_FIELDS = ['fullName', 'email'] as const

export const STEP2_FIELDS = [
  'contactPerson',
  'contactEmail',
  'address',
  'addressConfirmed',
  'mobileNumber',
  'mobileConfirmed',
  'businessNumber',
  'businessConfirmed',
] as const

export const STEP3_FIELDS = [
  'fitsPassengerSuv',
  'fitsWheelPackages',
  'fitsTruck',
  'wheelAlignmentPrice',
  'workingHours',
] as const
