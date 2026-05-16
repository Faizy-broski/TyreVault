import type {
  AdminFitmentCentreDetail,
  AdminCentreKPIs,
  AdminCentreJob,
  AdminCentreStats,
  PaymentSummary,
  PaymentHistoryRow,
  BankDetails,
  ComplianceDoc,
} from '@/types/admin.types'
import type { FitterPricingRow } from '@/types/fitter.types'

// ── Per-centre detail (maps fitment_id → full detail object) ──────────────

export const dummyCentreDetails: Record<string, AdminFitmentCentreDetail> = {
  fitment_001: {
    fitment_centre_id: 'fitment_001', user_id: 'user_001',
    business_name: 'Onyx Shield Brisbane', partner_id: 'PART-0001',
    is_active: true, created_at: '2024-08-12T00:00:00Z',
    contact_phone: '0733221100', business_number: '51 824 753 556',
    email: 'brisbane@onyxshield.com.au', role: null,
  },
  fitment_002: {
    fitment_centre_id: 'fitment_002', user_id: 'user_002',
    business_name: 'Onyx Shield Sydney North', partner_id: 'PART-0002',
    is_active: true, created_at: '2024-09-05T00:00:00Z',
    contact_phone: '0291234567', business_number: '42 711 634 882',
    email: 'sydneynorth@onyxshield.com.au', role: null,
  },
  fitment_003: {
    fitment_centre_id: 'fitment_003', user_id: 'user_003',
    business_name: 'Onyx Shield Melbourne CBD', partner_id: 'PART-0003',
    is_active: true, created_at: '2024-10-01T00:00:00Z',
    contact_phone: '0396541234', business_number: '33 508 922 771',
    email: 'melbourne@onyxshield.com.au', role: null,
  },
  fitment_004: {
    fitment_centre_id: 'fitment_004', user_id: 'user_004',
    business_name: 'Onyx Shield Perth', partner_id: 'PART-0004',
    is_active: true, created_at: '2024-11-18T00:00:00Z',
    contact_phone: '0892223344', business_number: '61 399 401 205',
    email: 'perth@onyxshield.com.au', role: null,
  },
  fitment_005: {
    fitment_centre_id: 'fitment_005', user_id: 'user_005',
    business_name: 'FastFit Adelaide', partner_id: 'PART-0005',
    is_active: false, created_at: '2025-01-07T00:00:00Z',
    contact_phone: '0882339900', business_number: '78 240 118 643',
    email: 'admin@fastfitadelaide.com.au', role: null,
  },
  fitment_006: {
    fitment_centre_id: 'fitment_006', user_id: 'user_006',
    business_name: 'Premier Tyre Centre', partner_id: 'PART-0006',
    is_active: true, created_at: '2025-02-22T00:00:00Z',
    contact_phone: '0755667788', business_number: '19 662 530 894',
    email: 'service@premiertyrecentre.com.au', role: null,
  },
  fitment_007: {
    fitment_centre_id: 'fitment_007', user_id: 'user_007',
    business_name: 'QuickFit Gold Coast', partner_id: 'PART-0007',
    is_active: true, created_at: '2025-03-14T00:00:00Z',
    contact_phone: '0756789012', business_number: '84 175 903 421',
    email: 'contact@quickfitgc.com.au', role: null,
  },
  fitment_008: {
    fitment_centre_id: 'fitment_008', user_id: 'user_008',
    business_name: 'TyrePro Canberra', partner_id: 'PART-0008',
    is_active: false, created_at: '2025-04-03T00:00:00Z',
    contact_phone: '0261234567', business_number: '56 821 047 339',
    email: 'info@tyreprocbr.com.au', role: null,
  },
}

// ── Shared KPIs (used for whichever centre is being viewed) ──────────────────

export const dummyCentreKPIs: AdminCentreKPIs = {
  activeJobs:         3,
  thisMonthCompleted: 18,
  averageRating:      4.7,
  ratingCount:        42,
  thisMonthEarnings:  7480.00,
}

// ── Shared jobs list ──────────────────────────────────────────────────────────

export const dummyCentreJobs: AdminCentreJob[] = [
  {
    job_id:          'job_001',
    task_number:     '49652-01',
    customer_name:   'Shagun Tyagi',
    customer_phone:  '0400250175',
    scheduled_date:  '2026-05-15',
    scheduled_time:  '10:00 AM',
    tyre_pattern:    'Michelin Pilot Sport 5',
    tyre_size:       '225/45R17',
    quantity:        2,
    vehicle_model:   'Toyota Camry',
    job_status:      'accepted',
    earnings_amount: 598.00,
    fitment_id:      'fitment_001',
    created_at:      '2026-05-11T12:35:00Z',
  },
  {
    job_id:          'job_002',
    task_number:     '49654-01',
    customer_name:   'David Lee',
    customer_phone:  '0400111222',
    scheduled_date:  '2026-05-14',
    scheduled_time:  '11:00 AM',
    tyre_pattern:    'Continental SportContact 7',
    tyre_size:       '225/40R18',
    quantity:        4,
    vehicle_model:   'BMW 3 Series',
    job_status:      'pending',
    earnings_amount: 713.00,
    fitment_id:      'fitment_001',
    created_at:      '2026-05-10T08:00:00Z',
  },
  {
    job_id:          'job_003',
    task_number:     '49658-01',
    customer_name:   'Liam Chen',
    customer_phone:  '0466778899',
    scheduled_date:  '2026-05-12',
    scheduled_time:  '09:00 AM',
    tyre_pattern:    'Hankook Ventus S1 Evo3',
    tyre_size:       '235/40R18',
    quantity:        4,
    vehicle_model:   'Mercedes C-Class',
    job_status:      'accepted',
    earnings_amount: 956.00,
    fitment_id:      'fitment_001',
    created_at:      '2026-05-08T15:45:00Z',
  },
  {
    job_id:          'job_004',
    task_number:     '49656-01',
    customer_name:   'James Walker',
    customer_phone:  '0433445566',
    scheduled_date:  '2026-05-10',
    scheduled_time:  '02:00 PM',
    tyre_pattern:    'Pirelli P Zero',
    tyre_size:       '275/35R21',
    quantity:        4,
    vehicle_model:   'Porsche 911',
    job_status:      'completed',
    earnings_amount: 1262.00,
    fitment_id:      'fitment_001',
    created_at:      '2026-05-09T11:05:00Z',
  },
  {
    job_id:          'job_005',
    task_number:     '49660-01',
    customer_name:   'Ryan Murphy',
    customer_phone:  '0488991122',
    scheduled_date:  '2026-05-10',
    scheduled_time:  '03:00 PM',
    tyre_pattern:    'Goodyear Eagle F1 Asymmetric 5',
    tyre_size:       '205/55R16',
    quantity:        4,
    vehicle_model:   'Mazda 3',
    job_status:      'cancelled',
    earnings_amount: 576.00,
    fitment_id:      'fitment_001',
    created_at:      '2026-05-07T13:20:00Z',
  },
  {
    job_id:          'job_006',
    task_number:     '49648-01',
    customer_name:   'Olivia Brown',
    customer_phone:  '0422114433',
    scheduled_date:  '2026-05-06',
    scheduled_time:  '01:00 PM',
    tyre_pattern:    'Bridgestone Turanza T005',
    tyre_size:       '205/55R16',
    quantity:        2,
    vehicle_model:   'Honda Civic',
    job_status:      'completed',
    earnings_amount: 390.00,
    fitment_id:      'fitment_001',
    created_at:      '2026-05-05T10:00:00Z',
  },
]

export const dummyCentreJobsTotal = dummyCentreJobs.length

// ── Stats (12-month purchases + login history) ─────────────────────────────

export const dummyCentreStats: AdminCentreStats = {
  purchase12Months: [
    { month: '2025-06', amount: 3200 },
    { month: '2025-07', amount: 4800 },
    { month: '2025-08', amount: 5100 },
    { month: '2025-09', amount: 3900 },
    { month: '2025-10', amount: 6200 },
    { month: '2025-11', amount: 5400 },
    { month: '2025-12', amount: 7100 },
    { month: '2026-01', amount: 4300 },
    { month: '2026-02', amount: 5800 },
    { month: '2026-03', amount: 6900 },
    { month: '2026-04', amount: 8200 },
    { month: '2026-05', amount: 7480 },
  ],
  loginHistory: [
    { ip: '203.12.44.91',  date: '12 May 2026, 09:14', area: 'Brisbane, QLD' },
    { ip: '203.12.44.91',  date: '11 May 2026, 18:32', area: 'Brisbane, QLD' },
    { ip: '101.180.77.55', date: '10 May 2026, 11:05', area: 'Brisbane, QLD' },
    { ip: '203.12.44.91',  date: '09 May 2026, 08:47', area: 'Brisbane, QLD' },
    { ip: '58.166.22.130', date: '07 May 2026, 14:21', area: 'Gold Coast, QLD' },
  ],
}

// ── Pricing rows ──────────────────────────────────────────────────────────

export const dummyCentrePricing: FitterPricingRow[] = [
  { id: 'pr_01', fitment_id: 'fitment_001', tyre_type: 'car',      rim_range: '13_15', per_tyre: 28,  per_pair: 50,  per_set_of_4: 90,  callout_fee: null },
  { id: 'pr_02', fitment_id: 'fitment_001', tyre_type: 'car',      rim_range: '16_18', per_tyre: 35,  per_pair: 62,  per_set_of_4: 115, callout_fee: null },
  { id: 'pr_03', fitment_id: 'fitment_001', tyre_type: 'car',      rim_range: '19_21', per_tyre: 42,  per_pair: 75,  per_set_of_4: 140, callout_fee: null },
  { id: 'pr_04', fitment_id: 'fitment_001', tyre_type: 'car',      rim_range: '22_plus', per_tyre: 55, per_pair: 98, per_set_of_4: 185, callout_fee: null },
  { id: 'pr_05', fitment_id: 'fitment_001', tyre_type: '4x4',     rim_range: '16_18', per_tyre: 45,  per_pair: 80,  per_set_of_4: 150, callout_fee: 40   },
  { id: 'pr_06', fitment_id: 'fitment_001', tyre_type: '4x4',     rim_range: '19_21', per_tyre: 55,  per_pair: 98,  per_set_of_4: 185, callout_fee: 40   },
  { id: 'pr_07', fitment_id: 'fitment_001', tyre_type: 'run_flat', rim_range: '16_18', per_tyre: 50,  per_pair: 90,  per_set_of_4: 170, callout_fee: null },
  { id: 'pr_08', fitment_id: 'fitment_001', tyre_type: 'run_flat', rim_range: '19_21', per_tyre: 60,  per_pair: 108, per_set_of_4: 200, callout_fee: null },
]

// ── Payment summary ────────────────────────────────────────────────────────

export const dummyPaymentSummary: PaymentSummary = {
  totalPaidThisYear:  52640.00,
  completedPayments:  18,
  pendingPayout:      7480.00,
  lastPaymentAmount:  6200.00,
  lastPaymentDate:    '2026-05-01T00:00:00Z',
  settlementSchedule: 'Monthly',
}

// ── Payment history rows ──────────────────────────────────────────────────

export const dummyPaymentHistory: PaymentHistoryRow[] = [
  {
    id:           'pmt_01',
    period_start: '2026-04-01',
    period_end:   '2026-04-30',
    order_count:  14,
    gross_amount: 6890.00,
    adjustments:  -690.00,
    net_payout:   6200.00,
    status:       'completed',
    payment_date: '2026-05-01T00:00:00Z',
    reference:    'PAY-APR-001',
    invoice_url:  null,
    created_at:   '2026-05-01T00:00:00Z',
  },
  {
    id:           'pmt_02',
    period_start: '2026-03-01',
    period_end:   '2026-03-31',
    order_count:  11,
    gross_amount: 7670.00,
    adjustments:  -770.00,
    net_payout:   6900.00,
    status:       'completed',
    payment_date: '2026-04-01T00:00:00Z',
    reference:    'PAY-MAR-001',
    invoice_url:  null,
    created_at:   '2026-04-01T00:00:00Z',
  },
  {
    id:           'pmt_03',
    period_start: '2026-02-01',
    period_end:   '2026-02-28',
    order_count:  10,
    gross_amount: 6445.00,
    adjustments:  -645.00,
    net_payout:   5800.00,
    status:       'completed',
    payment_date: '2026-03-01T00:00:00Z',
    reference:    'PAY-FEB-001',
    invoice_url:  null,
    created_at:   '2026-03-01T00:00:00Z',
  },
  {
    id:           'pmt_04',
    period_start: '2026-05-01',
    period_end:   '2026-05-31',
    order_count:  6,
    gross_amount: 7480.00,
    adjustments:  0,
    net_payout:   7480.00,
    status:       'in_progress',
    payment_date: null,
    reference:    null,
    invoice_url:  null,
    created_at:   '2026-05-12T00:00:00Z',
  },
]

export const dummyPaymentHistoryTotal = dummyPaymentHistory.length

// ── Bank details ──────────────────────────────────────────────────────────

export const dummyBankDetails: BankDetails = {
  id:                'bank_001',
  fitment_centre_id: 'fitment_001',
  account_holder:    'Onyx Shield Pty Ltd',
  bank_name:      'Commonwealth Bank of Australia',
  bsb:            '062-000',
  account_number: '12345678',
}

// ── Compliance docs ───────────────────────────────────────────────────────

export const dummyComplianceDocs: ComplianceDoc[] = [
  {
    id:            'doc_001',
    policy_type:   'Public Liability Insurance',
    provider:      'QBE Insurance',
    policy_number: 'QBE-PL-2024-88734',
    expiry_date:   '2026-12-31',
    status:        'valid',
    doc_url:       null,
    created_at:    '2024-08-12T00:00:00Z',
    updated_at:    '2025-01-10T00:00:00Z',
  },
  {
    id:            'doc_002',
    policy_type:   "Workers' Compensation",
    provider:      'WorkCover QLD',
    policy_number: 'WC-QLD-55-20881',
    expiry_date:   '2026-06-30',
    status:        'valid',
    doc_url:       null,
    created_at:    '2024-08-12T00:00:00Z',
    updated_at:    '2025-07-01T00:00:00Z',
  },
  {
    id:            'doc_003',
    policy_type:   'Business Licence',
    provider:      null,
    policy_number: 'BL-QLD-20249821',
    expiry_date:   '2026-09-15',
    status:        'valid',
    doc_url:       null,
    created_at:    '2024-08-15T00:00:00Z',
    updated_at:    '2025-09-16T00:00:00Z',
  },
  {
    id:            'doc_004',
    policy_type:   'Product Liability Insurance',
    provider:      null,
    policy_number: null,
    expiry_date:   null,
    status:        'pending',
    doc_url:       null,
    created_at:    '2026-04-01T00:00:00Z',
    updated_at:    '2026-04-01T00:00:00Z',
  },
]
