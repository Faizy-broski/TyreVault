'use client'

import { useFormContext } from 'react-hook-form'
import type { CreateProductFormValues } from '../schema'
import { normalizeTyreSize } from '@/lib/utils/size-normalizer'

const inputCls =
  'w-full rounded-lg border border-zinc-200 px-3 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors bg-white'
const selectCls =
  'w-full rounded-lg border border-zinc-200 px-3 py-2.5 text-sm text-zinc-900 bg-white focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors'
const labelCls = 'block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5'

const IDX = 0

function SectionCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden shadow-sm">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-zinc-100 bg-zinc-50/60">
        <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/15 text-zinc-800 shrink-0">
          {icon}
        </span>
        <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-wider">{title}</h3>
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  )
}

export default function ProductSpecsTab() {
  const { register, setValue } = useFormContext<CreateProductFormValues>()

  function handleSizeBlur(raw: string) {
    if (!raw) return
    try {
      normalizeTyreSize(raw)
      const metric = raw.match(/^(\d{2,3})[/\\](\d{2,3})[ZzRrDd-]?(\d{2,3})/i)
      if (metric) {
        setValue(`variants.${IDX}.width`,   Number(metric[1]))
        setValue(`variants.${IDX}.profile`, Number(metric[2]))
        setValue(`variants.${IDX}.rimSize`, Number(metric[3]))
        return
      }
      const imperial = raw.match(/^(\d{2,3})[xX](\d{2,3}(?:\.\d+)?)[Rr-](\d{2,3})/i)
      if (imperial) {
        setValue(`variants.${IDX}.width`,   Number(imperial[1]))
        setValue(`variants.${IDX}.profile`, Number(imperial[2]))
        setValue(`variants.${IDX}.rimSize`, Number(imperial[3]))
      }
    } catch { /* invalid size string */ }
  }

  return (
    <div className="space-y-5 w-full">

      {/* ── Product Identification ─────────────────────────────────── */}
      <SectionCard
        title="Product Identification"
        icon={
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
          </svg>
        }
      >
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
          <div>
            <label className={labelCls}>Tyre Size <span className="text-red-500 normal-case">*</span></label>
            <input
              {...register(`variants.${IDX}.tyreSizeDisplay`)}
              onBlur={e => handleSizeBlur(e.target.value)}
              placeholder="225/45R17"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>SKU <span className="text-red-500 normal-case">*</span></label>
            <input {...register(`variants.${IDX}.sku`)} placeholder="MB-501" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Barcode (EAN)</label>
            <input {...register(`variants.${IDX}.barcodeEan`)} placeholder="5902455056767" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Special Size</label>
            <input {...register(`variants.${IDX}.specialSize`)} placeholder="33X12.50R17" className={inputCls} />
          </div>
        </div>
      </SectionCard>

      {/* ── Dimensions ────────────────────────────────────────────── */}
      <SectionCard
        title="Dimensions"
        icon={
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
          </svg>
        }
      >
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
          <div>
            <label className={labelCls}>Width (mm)</label>
            <input type="number" {...register(`variants.${IDX}.width`, { valueAsNumber: true })} placeholder="225" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Aspect Ratio</label>
            <input type="number" {...register(`variants.${IDX}.profile`, { valueAsNumber: true })} placeholder="45" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Rim Size (in) <span className="text-red-500 normal-case">*</span></label>
            <input type="number" {...register(`variants.${IDX}.rimSize`, { valueAsNumber: true })} placeholder="17" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Country of Origin <span className="text-red-500 normal-case">*</span></label>
            <input {...register(`variants.${IDX}.countryOfOrigin`)} placeholder="CN" maxLength={3} className={`${inputCls} uppercase`} />
          </div>
        </div>
      </SectionCard>

      {/* ── Technical Specifications ───────────────────────────────── */}
      <SectionCard
        title="Technical Specifications"
        icon={
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z" />
          </svg>
        }
      >
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-5">
          <div>
            <label className={labelCls}>Load Index</label>
            <input {...register(`variants.${IDX}.loadIndex`)} placeholder="92" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Speed Rating</label>
            <input {...register(`variants.${IDX}.speedRating`)} placeholder="W" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Load / Speed</label>
            <input {...register(`variants.${IDX}.loadSpeedRating`)} placeholder="92W" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Construction</label>
            <select {...register(`variants.${IDX}.constructionType`)} className={selectCls}>
              <option value="">—</option>
              <option value="R">R (Radial)</option>
              <option value="ZR">ZR (Z-Radial)</option>
              <option value="D">D (Diagonal)</option>
              <option value="-">- (Cross-ply)</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-5">
          <div>
            <label className={labelCls}>Ply Rating</label>
            <input {...register(`variants.${IDX}.plyRating`)} placeholder="e.g. 10PR" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Load Range</label>
            <select {...register(`variants.${IDX}.loadRange`)} className={selectCls}>
              <option value="">N/A</option>
              {(['B','C','D','E','F','G'] as const).map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Sidewall</label>
            <select {...register(`variants.${IDX}.sidewall`)} className={selectCls}>
              <option value="">—</option>
              <option value="BSW">BSW (Black)</option>
              <option value="OWL">OWL (Outlined White Letters)</option>
              <option value="RWL">RWL (Raised White Letters)</option>
              <option value="WSW">WSW (White Sidewall)</option>
            </select>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-6 pt-4 border-t border-zinc-100">
          {[
            { field: 'xlReinforced' as const, label: 'XL / Reinforced' },
            { field: 'runflat'      as const, label: 'Runflat' },
            { field: 'ltSizing'    as const, label: 'LT (Light Truck)' },
          ].map(({ field, label }) => (
            <label key={field} className="flex items-center gap-2.5 cursor-pointer select-none group">
              <input
                type="checkbox"
                {...register(`variants.${IDX}.${field}`)}
                className="h-4 w-4 rounded border-zinc-300 accent-primary cursor-pointer"
              />
              <span className="text-sm font-medium text-zinc-700 group-hover:text-zinc-900 transition-colors">{label}</span>
            </label>
          ))}
          <div className="ml-auto w-48">
            <label className={labelCls}>Tube Type</label>
            <select {...register(`variants.${IDX}.tubeType`)} className={selectCls}>
              <option value="">—</option>
              <option value="tubeless">Tubeless</option>
              <option value="tube_type">Tube Type</option>
            </select>
          </div>
        </div>
      </SectionCard>

      {/* ── Physical Specifications ────────────────────────────────── */}
      <SectionCard
        title="Physical Specifications"
        icon={
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v17.25m0 0c-1.472 0-2.882.265-4.185.75M12 20.25c1.472 0 2.882.265 4.185.75M18.75 4.97A48.416 48.416 0 0012 4.5c-2.291 0-4.545.16-6.75.47m13.5 0c1.01.143 2.01.317 3 .52m-3-.52l2.62 10.726c.122.499-.106 1.028-.589 1.202a5.988 5.988 0 01-2.031.352 5.988 5.988 0 01-2.031-.352c-.483-.174-.711-.703-.59-1.202L18.75 4.97z" />
          </svg>
        }
      >
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-5">
          <div>
            <label className={labelCls}>Section Width (mm)</label>
            <input type="number" {...register(`variants.${IDX}.sectionWidth`, { valueAsNumber: true })} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Tread Depth (mm)</label>
            <input type="number" {...register(`variants.${IDX}.treadDepth`, { valueAsNumber: true })} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Weight (kg)</label>
            <input type="number" {...register(`variants.${IDX}.tyreWeight`, { valueAsNumber: true })} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Overall Dia. (mm)</label>
            <input type="number" {...register(`variants.${IDX}.overallDiameter`, { valueAsNumber: true })} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Max Load</label>
            <input {...register(`variants.${IDX}.maxLoad`)} placeholder="750kg" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Max Pressure</label>
            <input {...register(`variants.${IDX}.maxPressure`)} placeholder="51psi" className={inputCls} />
          </div>
        </div>
      </SectionCard>

      {/* ── Manufacturing ─────────────────────────────────────────── */}
      <SectionCard
        title="Manufacturing"
        icon={
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" />
          </svg>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div>
            <label className={labelCls}>Manufacturer Name</label>
            <input {...register(`variants.${IDX}.manufacturerName`)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Factory Name</label>
            <input {...register(`variants.${IDX}.factoryName`)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Factory Country</label>
            <input {...register(`variants.${IDX}.factoryCountry`)} placeholder="CN" maxLength={3} className={`${inputCls} uppercase`} />
          </div>
        </div>
      </SectionCard>

      {/* ── Compliance & Ratings ──────────────────────────────────── */}
      <SectionCard
        title="Compliance & Ratings"
        icon={
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
          </svg>
        }
      >
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
          <div>
            <label className={labelCls}>Fuel Rating</label>
            <input {...register(`variants.${IDX}.fuelRating`)} placeholder="C" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Wet Grip</label>
            <input {...register(`variants.${IDX}.wetGrip`)} placeholder="A" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Noise (dB)</label>
            <input {...register(`variants.${IDX}.noiseDb`)} placeholder="72dB" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Noise Class</label>
            <input {...register(`variants.${IDX}.noiseClass`)} placeholder="A" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>E-Mark</label>
            <input {...register(`variants.${IDX}.eMark`)} placeholder="E4 123456" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>DOT Code</label>
            <input {...register(`variants.${IDX}.dotCode`)} placeholder="XXXX XXX 2024" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>UTQG</label>
            <input {...register(`variants.${IDX}.utqg`)} placeholder="500 A A" className={inputCls} />
          </div>
        </div>
      </SectionCard>

      {/* ── Status ────────────────────────────────────────────────── */}
      <SectionCard
        title="SKU Status"
        icon={
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className={labelCls}>Status</label>
            <select {...register(`variants.${IDX}.status`)} className={selectCls}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="discontinued">Discontinued</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Replacement Product ID <span className="normal-case font-normal text-zinc-400">(if discontinued)</span></label>
            <input {...register(`variants.${IDX}.replacementProductId`)} placeholder="UUID of replacement SKU" className={inputCls} />
          </div>
        </div>
      </SectionCard>


    </div>
  )
}
