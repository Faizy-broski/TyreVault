'use client'

import { useState } from 'react'
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
  return diff > 0 && diff < 30 * 24 * 60 * 60 * 1000 // within 30 days
}

function isExpired(expiry: string | null) {
  if (!expiry) return false
  return new Date(expiry).getTime() < Date.now()
}

// Inline edit modal for a single compliance doc row
function EditModal({
  doc, centreId, accessToken,
  onClose, onSaved,
}: {
  doc:         ComplianceDoc
  centreId:    string
  accessToken: string
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-zinc-900">
            Update {POLICY_LABELS[doc.policy_type] ?? doc.policy_type}
          </h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-zinc-600 mb-1">Provider</label>
            <input
              value={form.provider}
              onChange={e => setForm(p => ({ ...p, provider: e.target.value }))}
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400/30 focus:border-yellow-400"
              placeholder="e.g. QBE Insurance"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-600 mb-1">Policy / Reference Number</label>
            <input
              value={form.policy_number}
              onChange={e => setForm(p => ({ ...p, policy_number: e.target.value }))}
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400/30 focus:border-yellow-400"
              placeholder="e.g. PLI-2025-88431"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-600 mb-1">Expiry Date</label>
            <input
              type="date"
              value={form.expiry_date}
              onChange={e => setForm(p => ({ ...p, expiry_date: e.target.value }))}
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400/30 focus:border-yellow-400"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-600 mb-1">Status</label>
            <select
              value={form.status}
              onChange={e => setForm(p => ({ ...p, status: e.target.value as ComplianceStatus }))}
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400/30 focus:border-yellow-400 bg-white"
            >
              <option value="valid">Valid</option>
              <option value="expired">Expired</option>
              <option value="pending">Pending</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium border border-zinc-300 rounded-lg text-zinc-700 hover:bg-zinc-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-sm font-semibold bg-yellow-400 text-zinc-900 rounded-lg hover:bg-yellow-500 disabled:opacity-60"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ComplianceDocTab({ centreId, initialDocs, accessToken }: Props) {
  const [docs, setDocs]         = useState<ComplianceDoc[]>(initialDocs)
  const [editingDoc, setEditing] = useState<ComplianceDoc | null>(null)

  function handleSaved(docId: string, updates: Partial<ComplianceDoc>) {
    setDocs(prev => prev.map(d => d.id === docId ? { ...d, ...updates } : d))
  }

  const expiredCount     = docs.filter(d => isExpired(d.expiry_date)).length
  const expiringSoonCount = docs.filter(d => isExpiringSoon(d.expiry_date)).length

  return (
    <div className="p-5 space-y-4">
      {/* Warning banners */}
      {expiredCount > 0 && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3">
          <svg className="w-4 h-4 text-red-500 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          <p className="text-xs text-red-700 font-medium">
            {expiredCount} document{expiredCount > 1 ? 's' : ''} expired — action required.
          </p>
        </div>
      )}
      {expiringSoonCount > 0 && (
        <div className="flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3">
          <svg className="w-4 h-4 text-amber-500 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          <p className="text-xs text-amber-700 font-medium">
            {expiringSoonCount} document{expiringSoonCount > 1 ? 's' : ''} expiring within 30 days.
          </p>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
        <table className="w-full text-sm">
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
                        <button
                          onClick={() => setEditing(doc)}
                          className="px-3 py-1 text-xs font-semibold rounded-lg bg-zinc-900 text-white hover:bg-zinc-700"
                        >
                          Update
                        </button>
                        {doc.doc_url ? (
                          <a
                            href={doc.doc_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1 text-xs font-semibold rounded-lg bg-green-600 text-white hover:bg-green-700"
                          >
                            Download
                          </a>
                        ) : (
                          <button
                            disabled
                            className="px-3 py-1 text-xs font-semibold rounded-lg bg-green-600 text-white opacity-40 cursor-not-allowed"
                          >
                            Download
                          </button>
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

      {/* Edit Modal */}
      {editingDoc && (
        <EditModal
          doc={editingDoc}
          centreId={centreId}
          accessToken={accessToken}
          onClose={() => setEditing(null)}
          onSaved={updates => handleSaved(editingDoc.id, updates)}
        />
      )}
    </div>
  )
}
