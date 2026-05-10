import { createClient } from '@/lib/supabase/server'
import FitmentCentreDetailClient from '@/components/admin/fitment-centres/FitmentCentreDetailClient'
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

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

interface Props {
  params: Promise<{ id: string }>
}

export default async function FitmentCentreDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  const token   = session?.access_token ?? ''
  const headers = { Authorization: `Bearer ${token}` }

  let centre:             AdminFitmentCentreDetail | null = null
  let kpis:               AdminCentreKPIs | null = null
  let jobs:               AdminCentreJob[] = []
  let jobsTotal           = 0
  let pricing:            FitterPricingRow[] = []
  let stats:              AdminCentreStats = { purchase12Months: [], loginHistory: [] }
  let paymentSummary:     PaymentSummary | null = null
  let initialPayments:    PaymentHistoryRow[] = []
  let initialPaymentTotal = 0
  let bankDetails:        BankDetails | null = null
  let complianceDocs:     ComplianceDoc[] = []

  try {
    const [
      centreRes, kpisRes, jobsRes, pricingRes, statsRes,
      paymentSummaryRes, paymentsRes, bankRes, complianceRes,
    ] = await Promise.all([
      fetch(`${API}/api/admin/fitment-centres/${id}`,                  { headers, cache: 'no-store' }),
      fetch(`${API}/api/admin/fitment-centres/${id}/kpis`,             { headers, cache: 'no-store' }),
      fetch(`${API}/api/admin/fitment-centres/${id}/jobs?page=1`,      { headers, cache: 'no-store' }),
      fetch(`${API}/api/admin/fitment-centres/${id}/pricing`,          { headers, cache: 'no-store' }),
      fetch(`${API}/api/admin/fitment-centres/${id}/stats`,            { headers, cache: 'no-store' }),
      fetch(`${API}/api/admin/fitment-centres/${id}/payments/summary`, { headers, cache: 'no-store' }),
      fetch(`${API}/api/admin/fitment-centres/${id}/payments?page=1`,  { headers, cache: 'no-store' }),
      fetch(`${API}/api/admin/fitment-centres/${id}/bank-details`,     { headers, cache: 'no-store' }),
      fetch(`${API}/api/admin/fitment-centres/${id}/compliance`,       { headers, cache: 'no-store' }),
    ])

    if (centreRes.ok)         centre           = await centreRes.json()
    if (kpisRes.ok)           kpis             = await kpisRes.json()
    if (jobsRes.ok)         { const j           = await jobsRes.json(); jobs = j.data ?? []; jobsTotal = j.total ?? 0 }
    if (pricingRes.ok)        pricing           = await pricingRes.json()
    if (statsRes.ok)          stats             = await statsRes.json()
    if (paymentSummaryRes.ok) paymentSummary    = await paymentSummaryRes.json()
    if (paymentsRes.ok)     { const p           = await paymentsRes.json(); initialPayments = p.data ?? []; initialPaymentTotal = p.total ?? 0 }
    if (bankRes.ok)           bankDetails       = await bankRes.json()
    if (complianceRes.ok)     complianceDocs    = await complianceRes.json()
  } catch { /* backend may not be running in dev */ }

  if (!centre) {
    return <div className="p-6 text-sm text-zinc-500">Fitment centre not found.</div>
  }

  return (
    <FitmentCentreDetailClient
      centre={centre}
      kpis={kpis}
      initialJobs={jobs}
      initialJobsTotal={jobsTotal}
      initialPricing={pricing}
      stats={stats}
      paymentSummary={paymentSummary}
      initialPayments={initialPayments}
      initialPaymentTotal={initialPaymentTotal}
      bankDetails={bankDetails}
      complianceDocs={complianceDocs}
      accessToken={token}
    />
  )
}
