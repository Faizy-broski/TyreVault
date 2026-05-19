'use client'

import { useState } from 'react'
import { AlertCircle, X } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle, DialogClose } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { ComplianceDoc, ComplianceStatus } from '@/types/admin.types'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

interface Props {
  centreId:     string
  initialDocs:  ComplianceDoc[]
  accessToken:  string
}

const POLICY_LABELS: Record<string, string> = {
  public_liability:      'Public Liability Insurance',
  workers_compensation:  'Workers Compensation Insurance',
  operating_license:     'Operating License',
  abn_verification:      'ABN Verification',
}

function statusLabel(s: ComplianceStatus) {
  return { valid: 'Valid', expired: 'Expired', pending: 'Pending', rejected: 'Rejected' }[s] ?? s
}

function StatusBadge({ status }: { status: ComplianceStatus }) {
  const colors: Record<ComplianceStatus, string> = {
    valid:    'text-green-600',
    expired:  'text-red-600',
    pending:  'text-amber-600',
    rejected: 'text-red-600',
  }
  return (
    <span className={`text-xs font-semibold ${colors[status]}`}>
      {statusLabel(status)}
    </span>
  )
}

function fmtDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-AU', { year: 'numeric', month: '2-digit', day: '2-digit' })
}

function isExpiringSoon(expiry: string | null) {
  if (!expiry) return false
  const diff = new Date(expiry).getTime() - Date.now()
  return diff > 0 && diff < 30 * 24 * 60 * 60 * 1000
}

function isExpired(expiry: string | null) {
  if (!expiry) return false
  return new Date(expiry).getTime() < Date.now()
}

function EditModal({
  doc, centreId, accessToken, open,
  onClose, onSaved,
}: {
  doc:         ComplianceDoc
  centreId:    string
  accessToken: string
  open:        boolean
  onClose:     () => void
  onSaved:     (updated: Partial<ComplianceDoc>) => void
}) {
  const [form, setForm] = useState({
    provider:      doc.provider      ?? '',
    policy_number: doc.policy_number ?? '',
    expiry_date:   doc.expiry_date   ?? '',
    status:        doc.status,
  })
  const [saving, setSaving] = useState(false)

  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` }

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch(
        `${API}/api/admin/fitment-centres/${centreId}/compliance/${doc.id}`,
        { method: 'PATCH', headers, body: JSON.stringify(form) }
      )
      if (res.ok) {
        onSaved(form)
        onClose()
      }
    } finally { setSaving(false) }
  }

  return (
    <Dialog open={open} onOpenChange={o => { if (!o) onClose() }}>
      <DialogContent className="p-0 gap-0 rounded-2xl shadow-xl ring-0 bg-white sm:max-w-md" showCloseButton={false}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200">
          <DialogTitle className="text-base font-semibold text-zinc-900">
            Update {POLICY_LABELS[doc.policy_type] ?? doc.policy_type}
          </DialogTitle>
          <DialogClose asChild>
            <Button variant="ghost" size="icon-sm" aria-label="Close">
              <X className="w-5 h-5" />
            </Button>
          </DialogClose>
        </div>

        <div className="px-6 py-5 space-y-3">
          <div>
            <label htmlFor="provider" className="block text-xs font-medium text-zinc-600 mb-1">Provider</label>
            <Input
              id="provider"
              value={form.provider}
              onChange={e => setForm(p => ({ ...p, provider: e.target.value }))}
              placeholder="e.g. QBE Insurance"
            />
          </div>
          <div>
            <label htmlFor="policy_number" className="block text-xs font-medium text-zinc-600 mb-1">Policy / Reference Number</label>
            <Input
              id="policy_number"
              value={form.policy_number}
              onChange={e => setForm(p => ({ ...p, policy_number: e.target.value }))}
              placeholder="e.g. PLI-2025-88431"
            />
          </div>
          <div>
            <label htmlFor="expiry_date" className="block text-xs font-medium text-zinc-600 mb-1">Expiry Date</label>
            <Input
              id="expiry_date"
              type="date"
              value={form.expiry_date}
              onChange={e => setForm(p => ({ ...p, expiry_date: e.target.value }))}
            />
          </div>
          <div>
            <label htmlFor="doc_status" className="block text-xs font-medium text-zinc-600 mb-1">Status</label>
            <select
              id="doc_status"
              value={form.status}
              onChange={e => setForm(p => ({ ...p, status: e.target.value as ComplianceStatus }))}
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white"
            >
              <option value="valid">Valid</option>
              <option value="expired">Expired</option>
              <option value="pending">Pending</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-zinc-100">
          <DialogClose asChild>
            <Button type="button" variant="outline">Cancel</Button>
          </DialogClose>
          <Button type="button" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default function ComplianceDocTab({ centreId, initialDocs, accessToken }: Props) {
  const [docs, setDocs]         = useState<ComplianceDoc[]>(initialDocs)
  const [editingDoc, setEditing] = useState<ComplianceDoc | null>(null)

  function handleSaved(docId: string, updates: Partial<ComplianceDoc>) {
    setDocs(prev => prev.map(d => d.id === docId ? { ...d, ...updates } : d))
  }

  const expiredCount      = docs.filter(d => isExpired(d.expiry_date)).length
  const expiringSoonCount = docs.filter(d => isExpiringSoon(d.expiry_date)).length

  return (
    <div className="p-5 space-y-4">
      {expiredCount > 0 && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
          <p className="text-xs text-red-700 font-medium">
            {expiredCount} document{expiredCount > 1 ? 's' : ''} expired — action required.
          </p>
        </div>
      )}
      {expiringSoonCount > 0 && (
        <div className="flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3">
          <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
          <p className="text-xs text-amber-700 font-medium">
            {expiringSoonCount} document{expiringSoonCount > 1 ? 's' : ''} expiring within 30 days.
          </p>
        </div>
      )}

      <div className="bg-white rounded-xl border border-zinc-200 overflow-x-auto">
        <table className="w-full text-sm min-w-160">
          <thead>
            <tr className="border-b border-zinc-100 bg-zinc-50">
              <th className="px-5 py-3 text-left text-xs font-medium text-zinc-500">Policy Type</th>
              <th className="px-5 py-3 text-left text-xs font-medium text-zinc-500">Provider</th>
              <th className="px-5 py-3 text-left text-xs font-medium text-zinc-500">Policy Number</th>
              <th className="px-5 py-3 text-left text-xs font-medium text-zinc-500">Expiry</th>
              <th className="px-5 py-3 text-left text-xs font-medium text-zinc-500">Status</th>
              <th className="px-5 py-3 text-left text-xs font-medium text-zinc-500">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {docs.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-sm text-zinc-400">
                  No compliance documents on file.
                </td>
              </tr>
            ) : (
              docs.map(doc => {
                const expired = isExpired(doc.expiry_date)
                const soon    = isExpiringSoon(doc.expiry_date)
                return (
                  <tr key={doc.id} className={`hover:bg-zinc-50 ${expired ? 'bg-red-50/40' : ''}`}>
                    <td className="px-5 py-3 text-sm font-medium text-zinc-800">
                      {POLICY_LABELS[doc.policy_type] ?? doc.policy_type}
                    </td>
                    <td className="px-5 py-3 text-sm text-zinc-600">{doc.provider ?? '—'}</td>
                    <td className="px-5 py-3 text-sm font-mono text-zinc-600">{doc.policy_number ?? '—'}</td>
                    <td className="px-5 py-3">
                      <span className={`text-sm ${expired ? 'text-red-600 font-semibold' : soon ? 'text-amber-600' : 'text-zinc-600'}`}>
                        {fmtDate(doc.expiry_date)}
                        {soon && !expired && <span className="ml-1 text-xs">(soon)</span>}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge status={doc.status} />
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          size="xs"
                          onClick={() => setEditing(doc)}
                        >
                          Update
                        </Button>
                        {doc.doc_url ? (
                          <Button
                            size="xs"
                            asChild
                            className="bg-green-600 text-white hover:bg-green-700"
                          >
                            <a href={doc.doc_url} target="_blank" rel="noopener noreferrer">
                              Download
                            </a>
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            size="xs"
                            disabled
                            className="bg-green-600 text-white opacity-40"
                          >
                            Download
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {editingDoc && (
        <EditModal
          doc={editingDoc}
          centreId={centreId}
          accessToken={accessToken}
          open={!!editingDoc}
          onClose={() => setEditing(null)}
          onSaved={updates => handleSaved(editingDoc.id, updates)}
        />
      )}
    </div>
  )
}
