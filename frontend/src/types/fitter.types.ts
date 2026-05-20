export type JobStatus = 'pending' | 'assigned' | 'accepted' | 'rejected' | 'in_progress' | 'completed' | 'cancelled'
export type TyreType  = 'car' | '4x4' | 'run_flat'
export type RimRange  = '13_15' | '16_18' | '19_21' | '22_plus'
export type EarningStatus = 'pending' | 'paid'

export interface FitterProfile {
  fitment_centre_id: string
  business_name:     string
  contact_name:      string | null
  email:             string | null
  contact_phone:     string | null
  business_number:   string | null
  partner_id:        string
  approved_status:   string | null
}

export interface WorkingHour {
  day:        string
  is_closed:  boolean
  open_time:  string
  close_time: string
}

export interface FitterServices {
  services_offered:         string[]
  wheel_alignment_price:    number | null
  mobile_fitting_available: boolean
  opening_hours:            WorkingHour[] | null
}

export interface FitmentCentre {
  fitment_centre_id: string
  business_name: string
  partner_id:        string
  contact_phone:     string | null
  business_number:   string | null
  user_id:           string | null
  is_active:         boolean
}

export interface FitmentJob {
  job_id:            string
  task_number:       string
  customer_name:     string
  customer_phone:    string | null
  scheduled_date:    string | null
  scheduled_time:    string | null
  tyre_pattern:      string | null
  tyre_size:         string | null
  quantity:          number
  vehicle_model:     string | null
  job_status:        JobStatus
  notes:             string | null
  fitter_notes:      string | null
  admin_notes:       string | null
  accepted_at:       string | null
  completed_at:      string | null
  earnings_amount:   number | null
  fitment_centre_id: string
  created_at:        string
}

export interface FitterPricingRow {
  id:           string
  fitment_centre_id: string
  tyre_type:         TyreType
  rim_range:         RimRange
  per_tyre:          number | null
  per_pair:          number | null
  per_set_of_4:      number | null
  callout_fee:       number | null
}

export interface FitterEarning {
  id:          string
  fitment_centre_id: string
  job_id:            string | null
  customer_name:     string | null
  amount:            number
  status:            EarningStatus
  payment_date:      string | null
  created_at:        string
}

export interface FitterKPIs {
  newJobsToday:            number
  pendingJobs:             number
  scheduledThisWeek:       number
  earningsThisMonth:       number
  completedJobsThisMonth:  number
  pendingPayouts:          number
}

// Pricing matrix shape used in UI
export type PricingMatrix = Record<TyreType, Record<RimRange, {
  per_tyre:     string
  per_pair:     string
  per_set_of_4: string
  callout_fee:  string
}>>

export const TYRE_TYPES: { key: TyreType; label: string; description: string }[] = [
  { key: 'car',      label: 'Car Tyres',      description: 'Set your prices for different rim sizes. All prices in AUD.' },
  { key: '4x4',      label: '4x4 Tyres',      description: 'Set your prices for different rim sizes. All prices in AUD.' },
  { key: 'run_flat', label: 'Run Flat Tyres',  description: 'Set your prices for different rim sizes. All prices in AUD.' },
]

export const RIM_RANGES: { key: RimRange; label: string }[] = [
  { key: '13_15',   label: '13-15"' },
  { key: '16_18',   label: '16-18"' },
  { key: '19_21',   label: '19-21"' },
  { key: '22_plus', label: '22"+'   },
]

export function emptyPricingMatrix(): PricingMatrix {
  const matrix = {} as PricingMatrix
  for (const t of TYRE_TYPES) {
    matrix[t.key] = {} as Record<RimRange, { per_tyre: string; per_pair: string; per_set_of_4: string; callout_fee: string }>
    for (const r of RIM_RANGES) {
      matrix[t.key][r.key] = { per_tyre: '', per_pair: '', per_set_of_4: '', callout_fee: '' }
    }
  }
  return matrix
}
