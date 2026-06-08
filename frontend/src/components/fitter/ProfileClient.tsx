'use client'

import { useState, useEffect, useRef } from 'react'
import { Save, Building2, User, Mail, Phone, Hash, BadgeCheck, Upload, Trash2 } from 'lucide-react'
import Image from 'next/image'
import { useQueryClient } from '@tanstack/react-query'
import { Button }   from '@/components/ui/button'
import { Input }    from '@/components/ui/input'
import { Label }    from '@/components/ui/label'
import { Badge }    from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { FitterBreadcrumb } from '@/components/fitter/FitterBreadcrumb'
import { useFitterProfile } from '@/lib/query/fitter-hooks'
import { fitterKeys } from '@/lib/query/keys'
import { BACKEND_API_URL, createBackendHeaders } from '@/lib/backend-api'
import { createClient } from '@/lib/supabase/client'

async function getToken(): Promise<string> {
  const { data: { session } } = await createClient().auth.getSession()
  return session?.access_token ?? ''
}

const STATUS_STYLE: Record<string, string> = {
  approved:  'bg-green-100 text-green-700 border-0',
  pending:   'bg-amber-100 text-amber-700 border-0',
  rejected:  'bg-red-100 text-red-600 border-0',
  suspended: 'bg-zinc-100 text-zinc-600 border-0',
}

function FieldSkeleton() {
  return (
    <div className="space-y-1.5">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-10 w-full rounded-lg" />
    </div>
  )
}

interface FormState {
  business_name:   string
  contact_name:    string
  email:           string
  contact_phone:   string
  business_number: string
}

const EMPTY_FORM: FormState = {
  business_name:   '',
  contact_name:    '',
  email:           '',
  contact_phone:   '',
  business_number: '',
}

export default function ProfileClient() {
  const queryClient = useQueryClient()
  const [form,         setForm]         = useState<FormState>(EMPTY_FORM)
  const [saving,       setSaving]       = useState(false)
  const [saved,        setSaved]        = useState(false)
  const [error,        setError]        = useState('')
  const [logoUrl,      setLogoUrl]      = useState<string | null>(null)
  const [logoUploading, setLogoUploading] = useState(false)
  const [logoError,    setLogoError]    = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const seeded = useRef(false)

  const { data: profile, isPending: loading } = useFitterProfile()

  useEffect(() => {
    if (!profile) return
    if (!seeded.current) {
      setForm({
        business_name:   profile.business_name    ?? '',
        contact_name:    profile.contact_name     ?? '',
        email:           profile.email            ?? '',
        contact_phone:   profile.contact_phone    ?? '',
        business_number: profile.business_number  ?? '',
      })
      seeded.current = true
    }
    if (!logoUploading) {
      setLogoUrl(profile.logo_url ?? null)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile])

  function handleChange(field: keyof FormState, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
    setSaved(false)
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !profile) return
    if (file.size > 2 * 1024 * 1024) { setLogoError('Image must be under 2 MB.'); return }
    setLogoError('')
    setLogoUploading(true)
    try {
      const supabase  = createClient()
      const ext       = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
      const path      = `${profile.fitment_centre_id}/logo.${ext}`
      const { error: upErr } = await supabase.storage
        .from('fitter-logos')
        .upload(path, file, { upsert: true, contentType: file.type })
      if (upErr) { setLogoError('Upload failed: ' + upErr.message); return }

      const { data: { publicUrl } } = supabase.storage.from('fitter-logos').getPublicUrl(path)
      const bustedUrl = `${publicUrl}?t=${Date.now()}`

      const token = await getToken()
      const saveRes = await fetch(`${BACKEND_API_URL}/api/fitter/portal/profile`, {
        method:  'PUT',
        headers: createBackendHeaders(token, { 'Content-Type': 'application/json' }),
        body:    JSON.stringify({ ...form, logo_url: publicUrl }),
      })
      if (!saveRes.ok) { setLogoError('Photo uploaded but failed to save to profile. Try again.'); return }
      setLogoUrl(bustedUrl)
      queryClient.invalidateQueries({ queryKey: fitterKeys.profile() })
    } finally {
      setLogoUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function handleLogoRemove() {
    if (!profile || !logoUrl) return
    setLogoError('')
    setLogoUploading(true)
    try {
      const supabase = createClient()
      // Remove all logo.* files for this centre
      const { data: files } = await supabase.storage
        .from('fitter-logos')
        .list(profile.fitment_centre_id)
      if (files?.length) {
        await supabase.storage.from('fitter-logos')
          .remove(files.map(f => `${profile.fitment_centre_id}/${f.name}`))
      }
      const token = await getToken()
      await fetch(`${BACKEND_API_URL}/api/fitter/portal/profile`, {
        method:  'PUT',
        headers: createBackendHeaders(token, { 'Content-Type': 'application/json' }),
        body:    JSON.stringify({ ...form, logo_url: null }),
      })
      setLogoUrl(null)
      queryClient.invalidateQueries({ queryKey: fitterKeys.profile() })
    } finally { setLogoUploading(false) }
  }

  async function handleSave() {
    setSaving(true); setError('')
    const token = await getToken()
    try {
      const res = await fetch(`${BACKEND_API_URL}/api/fitter/portal/profile`, {
        method:  'PUT',
        headers: createBackendHeaders(token, { 'Content-Type': 'application/json' }),
        body:    JSON.stringify(form),
      })
      if (!res.ok) { setError('Failed to save profile.'); return }
      setSaved(true)
      queryClient.invalidateQueries({ queryKey: fitterKeys.profile() })
    } finally { setSaving(false) }
  }

  return (
    <div className="p-4 sm:p-6">
      <FitterBreadcrumb crumbs={[{ label: 'Profile & Settings' }]} />

      <div className="flex flex-wrap items-center justify-between gap-3 mb-6 mt-5">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">Profile &amp; Settings</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Manage your business information</p>
        </div>
        <Button
          size="sm"
          onClick={handleSave}
          disabled={saving || loading}
          className="gap-2 rounded-lg bg-primary text-zinc-900 hover:bg-primary/90 font-semibold disabled:opacity-60"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving…' : saved ? 'Saved!' : 'Save changes'}
        </Button>
      </div>

      {error && (
        <Alert className="mb-4 rounded-lg bg-red-50 border-red-200 text-red-700">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {saved && (
        <Alert className="mb-4 rounded-lg bg-green-50 border-green-200 text-green-700">
          <AlertDescription>Profile saved successfully.</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_280px] gap-6">

        {/* ── Main form card ── */}
        <div className="space-y-5">

          {/* Business details */}
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-none hover:shadow-md transition-all duration-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-200 bg-zinc-50/50 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-zinc-400" />
              <h2 className="text-sm font-semibold text-zinc-900">Business Details</h2>
            </div>
            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {loading ? (
                <>
                  <FieldSkeleton /><FieldSkeleton />
                  <FieldSkeleton /><FieldSkeleton />
                </>
              ) : (
                <>
                  <div className="sm:col-span-2 space-y-1.5">
                    <Label htmlFor="business_name" className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Business Name</Label>
                    <Input
                      id="business_name"
                      value={form.business_name}
                      onChange={e => handleChange('business_name', e.target.value)}
                      placeholder="e.g. QuickFit Tyres Melbourne"
                      className="h-10 border-zinc-200 bg-zinc-50 focus-visible:ring-primary/30 focus-visible:border-primary focus-visible:bg-white transition-colors"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="contact_phone" className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Contact Phone</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
                      <Input
                        id="contact_phone"
                        type="tel"
                        value={form.contact_phone}
                        onChange={e => handleChange('contact_phone', e.target.value)}
                        placeholder="04XX XXX XXX"
                        className="pl-9 h-10 border-zinc-200 bg-zinc-50 focus-visible:ring-primary/30 focus-visible:border-primary focus-visible:bg-white transition-colors"
                      />
                    </div>
                    <p className="text-[11px] text-zinc-400">Must be a valid Australian mobile number</p>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="business_number" className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">ABN / ACN</Label>
                    <div className="relative">
                      <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
                      <Input
                        id="business_number"
                        value={form.business_number}
                        onChange={e => handleChange('business_number', e.target.value)}
                        placeholder="XX XXX XXX XXX"
                        className="pl-9 h-10 border-zinc-200 bg-zinc-50 focus-visible:ring-primary/30 focus-visible:border-primary focus-visible:bg-white transition-colors"
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Contact person details */}
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-none hover:shadow-md transition-all duration-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-200 bg-zinc-50/50 flex items-center gap-2">
              <User className="w-4 h-4 text-zinc-400" />
              <h2 className="text-sm font-semibold text-zinc-900">Contact Person</h2>
            </div>
            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {loading ? (
                <><FieldSkeleton /><FieldSkeleton /></>
              ) : (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="contact_name" className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Full Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
                      <Input
                        id="contact_name"
                        value={form.contact_name}
                        onChange={e => handleChange('contact_name', e.target.value)}
                        placeholder="e.g. John Smith"
                        className="pl-9 h-10 border-zinc-200 bg-zinc-50 focus-visible:ring-primary/30 focus-visible:border-primary focus-visible:bg-white transition-colors"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Email Address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
                      <Input
                        id="email"
                        type="email"
                        value={form.email}
                        onChange={e => handleChange('email', e.target.value)}
                        placeholder="contact@yourbusiness.com"
                        className="pl-9 h-10 border-zinc-200 bg-zinc-50 focus-visible:ring-primary/30 focus-visible:border-primary focus-visible:bg-white transition-colors"
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* ── Sidebar info card ── */}
        <div className="shrink-0 space-y-4">

          {/* Profile picture */}
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-none hover:shadow-md transition-all duration-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-200 bg-zinc-50/50 flex items-center gap-2">
              <User className="w-4 h-4 text-zinc-400" />
              <h3 className="text-sm font-semibold text-zinc-900">Profile Picture</h3>
            </div>
            <div className="p-5 flex flex-col items-center gap-4">
              {/* Avatar preview */}
              <div className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-zinc-200 bg-zinc-100 shrink-0">
                {logoUrl ? (
                  <Image src={logoUrl} alt="Profile" fill className="object-cover" unoptimized />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <User className="w-10 h-10 text-zinc-300" />
                  </div>
                )}
                {logoUploading && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-full">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>

              {logoError && <p className="text-xs text-red-500 text-center">{logoError}</p>}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleLogoUpload}
              />

              <div className="flex flex-col gap-2 w-full">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={logoUploading || loading}
                  className="w-full gap-2 rounded-lg bg-primary text-zinc-900 hover:bg-primary/90 text-xs font-semibold"
                >
                  <Upload className="w-3.5 h-3.5" />
                  {logoUrl ? 'Change photo' : 'Upload photo'}
                </Button>
                {logoUrl && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleLogoRemove}
                    disabled={logoUploading}
                    className="w-full gap-2 rounded-lg text-red-500 hover:bg-red-50 hover:text-red-600 text-xs font-semibold"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Remove photo
                  </Button>
                )}
              </div>
              <p className="text-[11px] text-zinc-400 text-center">JPG, PNG or WebP · Max 2 MB</p>
            </div>
          </div>

          {/* Account info */}
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-none hover:shadow-md transition-all duration-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-200 bg-zinc-50/50 flex items-center gap-2">
              <BadgeCheck className="w-4 h-4 text-zinc-400" />
              <h3 className="text-sm font-semibold text-zinc-900">Account Info</h3>
            </div>
            <div className="p-5 space-y-4">
              {loading ? (
                <><FieldSkeleton /><FieldSkeleton /></>
              ) : (
                <>
                  <div>
                    <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1">Partner ID</p>
                    <p className="text-sm font-mono font-semibold text-zinc-800">{profile?.partner_id ?? '—'}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Account Status</p>
                    <Badge className={`text-xs font-semibold px-2.5 py-0.5 rounded-full capitalize ${STATUS_STYLE[profile?.approved_status ?? ''] ?? 'bg-zinc-100 text-zinc-500 border-0'}`}>
                      {profile?.approved_status ?? 'Unknown'}
                    </Badge>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Tips */}
          <div className="rounded-2xl bg-primary p-5">
            <h3 className="text-sm font-bold text-zinc-900 mb-3">Profile Tips</h3>
            <ul className="space-y-2.5">
              {[
                'Keep your contact details up to date so customers can reach you.',
                'Your ABN is required for payment processing and invoicing.',
                'A correct phone number ensures you receive job alerts.',
              ].map((tip, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-zinc-800 leading-relaxed">
                  <span className="mt-0.5 shrink-0">•</span>
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

