'use client'

import { useState } from 'react'
import type {
  AdminFitmentCentreDetail,
  AdminCentreKPIs,
  AdminCentreJob,
  AdminCentreJobStatus,
  AdminCentreStats,
  PaymentSummary,
  PaymentHistoryRow,
  BankDetails,
  ComplianceDoc,
} from '@/types/admin.types'
import type { FitterPricingRow } from '@/types/fitter.types'
import FitmentOrdersTab    from './tabs/FitmentOrdersTab'
import PricingOverrideTab  from './tabs/PricingOverrideTab'
import PaymentSettlementTab from './tabs/PaymentSettlementTab'
import ComplianceDocTab    from './tabs/ComplianceDocTab'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

interface Props {
  centre:             AdminFitmentCentreDetail
  kpis:               AdminCentreKPIs | null
  initialJobs:        AdminCentreJob[]
  initialJobsTotal:   number
  initialPricing:     FitterPricingRow[]
  stats:              AdminCentreStats
  paymentSummary:     PaymentSummary | null
  initialPayments:    PaymentHistoryRow[]
  initialPaymentTotal: number
  bankDetails:        BankDetails | null
  complianceDocs:     ComplianceDoc[]
  accessToken:        string
}

type Tab = 'orders' | 'pricing' | 'payment' | 'compliance'

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-zinc-400">{label}</p>
      <p className="text-sm font-medium text-zinc-800 mt-0.5">{value ?? '—'}</p>
    </div>
  )
}

function YesNo({ yes }: { yes: boolean }) {
  return (
    <span className={`text-xs font-semibold ${yes ? 'text-green-600' : 'text-red-500'}`}>
      {yes ? 'Yes' : 'No'}
    </span>
  )
}

function StatCard({ label, value, sub, icon }: {
  label: string; value: React.ReactNode; sub?: string; icon: React.ReactNode
}) {
  return (
    <div className="bg-white rounded-xl border border-zinc-200 p-4 flex items-start gap-3">
      <div className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center shrink-0 text-zinc-500">
        {icon}
      </div>
      <div>
        <p className="text-xs text-zinc-500">{label}</p>
        <p className="text-xl font-bold text-zinc-900 mt-0.5">{value}</p>
        {sub && <p className="text-xs text-zinc-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

export default function FitmentCentreDetailClient({
  centre, kpis, initialJobs, initialJobsTotal, initialPricing, stats,
  paymentSummary, initialPayments, initialPaymentTotal, bankDetails,
  complianceDocs, accessToken,
}: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('orders')
  const [isActive, setIsActive]   = useState(centre.is_active)
  const [togglingStatus, setTogglingStatus] = useState(false)

  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` }

  async function toggleStatus() {
    setTogglingStatus(true)
    try {
      const next = !isActive
      const res = await fetch(
        `${API}/api/admin/fitment-centres/${centre.fitment_centre_id}/status`,
        { method: 'PATCH', headers, body: JSON.stringify({ is_active: next }) }
      )
      if (res.ok) setIsActive(next)
    } finally { setTogglingStatus(false) }
  }

  function fmtAUD(n: number) {
    return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(n)
  }

  const email      = centre.email ?? '—'
  const joinedDate = centre.created_at
    ? new Date(centre.created_at).toLocaleDateString('en-AU', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : '—'

  const tabs: { key: Tab; label: string }[] = [
    { key: 'orders',     label: 'Fitment Orders'       },
    { key: 'pricing',    label: 'Pricing Override'      },
    { key: 'payment',    label: 'Payment and Settlement'},
    { key: 'compliance', label: 'Compliance & Doc'      },
  ]

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-semibold text-zinc-900">{centre.business_name}</h1>
        <div className="flex items-center gap-2">
          <Button
            onClick={toggleStatus}
            disabled={togglingStatus}
            className={`px-4 py-1.5 rounded-lg text-sm font-semibold h-auto transition-colors disabled:opacity-60 ${
              isActive
                ? 'bg-amber-400 text-zinc-900 hover:bg-amber-500'
                : 'bg-green-500 text-white hover:bg-green-600'
            }`}
          >
            {togglingStatus ? '...' : isActive ? 'Hold' : 'Activate'}
          </Button>
          <Button variant="outline" className="px-4 py-1.5 rounded-lg text-sm font-semibold h-auto border-zinc-300 text-zinc-700 hover:bg-zinc-50">
            Edit Profile
          </Button>
        </div>
      </div>

      {/* Three-column info layout */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Left — Profile */}
        <div className="bg-white rounded-xl border border-zinc-200 p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-zinc-400">Created by</p>
              <p className="text-sm font-medium text-zinc-800 mt-0.5">—</p>
              <p className="text-xs text-zinc-400 mt-0.5">{joinedDate}</p>
            </div>
            <InfoRow label="Contact Person" value="—" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <InfoRow label="ABN" value={centre.business_number} />
            <div>
              <p className="text-xs text-zinc-400">Online Shop</p>
              <div className="mt-1">
                <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600">
                  <span className="w-7 h-4 rounded-full bg-green-500 flex items-center justify-end pr-0.5">
                    <span className="w-3 h-3 rounded-full bg-white" />
                  </span>
                  On
                </span>
              </div>
            </div>
          </div>
          <InfoRow label="Address" value="—" />
          <div className="grid grid-cols-2 gap-4">
            <InfoRow label="Email" value={email} />
            <InfoRow label="Phone Number" value={centre.contact_phone} />
          </div>
        </div>

        {/* Middle — Operations */}
        <div className="bg-white rounded-xl border border-zinc-200 p-5 space-y-4">
          <div>
            <p className="text-xs text-zinc-500 font-medium uppercase tracking-wide mb-3">Fitment Center Operations</p>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-zinc-700">Fitment Center Status</p>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-semibold ${isActive ? 'text-green-600' : 'text-amber-600'}`}>
                  {isActive ? 'Active' : 'Hold'}
                </span>
                <button
                  onClick={toggleStatus}
                  className={`w-9 h-5 rounded-full transition-colors ${isActive ? 'bg-green-500' : 'bg-zinc-300'}`}
                >
                  <span className={`block w-4 h-4 bg-white rounded-full shadow transition-transform mx-0.5 ${isActive ? 'translate-x-4' : ''}`} />
                </button>
              </div>
            </div>
          </div>

          <div>
            <p className="text-xs font-medium text-zinc-500 mb-2">Fitting options</p>
            <div className="space-y-1.5">
              {[
                { label: 'Car/SUV/4X4 Tyres', yes: true },
                { label: 'Tyre and Wheel Package', yes: true },
                { label: 'Truck Fitting', yes: false },
              ].map(row => (
                <div key={row.label} className="flex items-center justify-between text-sm">
                  <span className="text-zinc-600">{row.label}</span>
                  <YesNo yes={row.yes} />
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-medium text-zinc-500 mb-2">Addition services</p>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-zinc-600">Wheel Alignment</span>
                <span className="text-xs font-semibold text-zinc-800">—</span>
              </div>
              {[
                { label: 'Mobile Tyre Fitting', yes: true },
                { label: 'Truck Fitting', yes: false },
              ].map(row => (
                <div key={row.label} className="flex items-center justify-between text-sm">
                  <span className="text-zinc-600">{row.label}</span>
                  <YesNo yes={row.yes} />
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-medium text-zinc-500 mb-2">Working days & timing</p>
            <div className="space-y-1 text-xs text-zinc-600">
              <div className="flex justify-between"><span>Monday - Friday</span><span className="font-medium">—</span></div>
              <div className="flex justify-between"><span>Saturday</span><span className="font-medium">—</span></div>
              <div className="flex justify-between"><span>Sunday</span><span className="text-red-500 font-medium">Closed</span></div>
            </div>
          </div>
        </div>

        {/* Right — Customer Critical Info */}
        <div className="bg-primary rounded-xl p-4 space-y-3">
          <p className="text-xs font-bold text-zinc-900 uppercase tracking-wide">Customer critical Information</p>

          <div className="bg-white/60 rounded-lg p-3 space-y-0.5">
            <p className="text-xs font-bold text-zinc-900 uppercase tracking-wide">Customer Lifetime Value</p>
            <p className="text-lg font-bold text-zinc-900">{fmtAUD(kpis?.thisMonthEarnings ?? 0)}</p>
            <p className="text-xs text-zinc-600">First order: —</p>
          </div>

          <div className="space-y-2.5 text-sm">
            <div className="flex justify-between">
              <span className="text-xs text-zinc-700">Average Order Value</span>
              <span className="text-xs font-semibold text-zinc-900">—</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-zinc-700">Credit Limit</span>
              <span className="text-xs font-semibold text-zinc-900">—</span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-zinc-700">Payment Type</span>
              <span className="text-xs font-semibold text-zinc-900">—</span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-zinc-700">Area</span>
              <span className="text-xs font-semibold text-zinc-900">—</span>
            </div>
            <div className="pt-2 border-t border-white/50">
              <p className="text-xs text-zinc-700">Outstanding Amount</p>
              <p className="text-base font-bold text-zinc-900">{fmtAUD(0)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Sales Trend */}
        <div className="bg-white rounded-xl border border-zinc-200 p-4">
          <div className="flex items-start justify-between">
            <p className="text-xs font-medium text-zinc-500">Sales Trend</p>
            <svg className="w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
            </svg>
          </div>
          <div className="mt-2 flex items-end gap-4">
            <div>
              <p className="text-xs text-zinc-400">Current</p>
              <p className="text-sm font-bold text-green-600">{fmtAUD(kpis?.thisMonthEarnings ?? 0)}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-400">Previous</p>
              <p className="text-sm font-bold text-zinc-500">{fmtAUD(0)}</p>
            </div>
          </div>
          <p className="text-xs text-green-600 font-semibold mt-1">Trend —</p>
        </div>

        {/* Activity Status */}
        <div className="bg-white rounded-xl border border-zinc-200 p-4">
          <div className="flex items-start justify-between">
            <p className="text-xs font-medium text-zinc-500">Activity Status</p>
            <svg className="w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
            </svg>
          </div>
          <div className="mt-2 space-y-1 text-xs text-zinc-600">
            <div className="flex justify-between"><span>Suspicious Activity</span><span className="font-semibold text-green-600">No</span></div>
            <div className="flex justify-between"><span>Inactivity Status</span><span className="font-semibold text-green-600">No</span></div>
          </div>
          <p className="text-xs text-zinc-400 mt-2">Last Purchase — days ago</p>
        </div>

        {/* Churn Risk */}
        <div className="bg-white rounded-xl border border-zinc-200 p-4">
          <div className="flex items-start justify-between">
            <p className="text-xs font-medium text-zinc-500">Churn Risk Status</p>
            <svg className="w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
          </div>
          <p className="text-sm font-bold text-green-600 mt-2">Low Risk</p>
          <p className="text-xs text-zinc-400">— CRS</p>
          <Button variant="link" className="text-xs text-primary h-auto p-0 mt-1">Edit</Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
        <Tabs value={activeTab} onValueChange={v => setActiveTab(v as Tab)}>
          <div className="overflow-x-auto border-b border-zinc-100">
            <TabsList className="w-max min-w-full justify-start rounded-none bg-transparent px-0 h-auto">
              {tabs.map(tab => (
                <TabsTrigger
                  key={tab.key}
                  value={tab.key}
                  className="px-4 sm:px-5 py-3 text-sm font-medium rounded-none whitespace-nowrap data-[state=active]:text-zinc-900 data-[state=active]:border-b-3 data-[state=active]:border-b-primary text-zinc-500 hover:text-zinc-700"
                >
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <TabsContent value="orders" className="mt-0">
            <FitmentOrdersTab
              centreId={centre.fitment_centre_id}
              kpis={kpis}
              initialJobs={initialJobs}
              initialTotal={initialJobsTotal}
              stats={stats}
              accessToken={accessToken}
            />
          </TabsContent>
          <TabsContent value="pricing" className="mt-0">
            <PricingOverrideTab
              centreId={centre.fitment_centre_id}
              initialRows={initialPricing}
              accessToken={accessToken}
            />
          </TabsContent>
          <TabsContent value="payment" className="mt-0">
            <PaymentSettlementTab
              centreId={centre.fitment_centre_id}
              initialSummary={paymentSummary}
              initialHistory={initialPayments}
              initialTotal={initialPaymentTotal}
              initialBank={bankDetails}
              accessToken={accessToken}
            />
          </TabsContent>
          <TabsContent value="compliance" className="mt-0">
            <ComplianceDocTab
              centreId={centre.fitment_centre_id}
              initialDocs={complianceDocs}
              accessToken={accessToken}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
