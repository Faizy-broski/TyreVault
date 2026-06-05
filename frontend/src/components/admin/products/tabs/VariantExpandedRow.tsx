'use client'

import { useState } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
import type { CreateProductFormValues } from '../schema'

const inputCls =
  'w-full rounded border border-zinc-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30'
const selectCls =
  'w-full rounded border border-zinc-200 px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30'
const labelCls = 'block text-xs font-medium text-zinc-600 mb-1'
const sectionHdrCls =
  'flex items-center gap-2 text-xs font-semibold text-zinc-700 uppercase tracking-wide mb-3 before:content-[""] before:block before:w-1 before:h-4 before:rounded-full before:bg-primary'

export default function VariantExpandedRow({ index }: { index: number }) {
  const { register, setValue, control } = useFormContext<CreateProductFormValues>()
  const variantImages =
    useWatch({ control, name: `variants.${index}.variantImages` }) ?? []
  const [newUrl, setNewUrl] = useState('')

  function addImage() {
    const url = newUrl.trim()
    if (!url) return
    setValue(`variants.${index}.variantImages`, [...variantImages, url])
    setNewUrl('')
  }

  function removeImage(i: number) {
    setValue(
      `variants.${index}.variantImages`,
      variantImages.filter((_, j) => j !== i)
    )
  }

  return (
    <div className="space-y-6 py-1">

      {/* ── Load & Speed ──────────────────────────────────────────── */}
      <div>
        <p className={sectionHdrCls}>Load &amp; Speed</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <label className={labelCls}>Load/Speed Rating</label>
            <input
              {...register(`variants.${index}.loadSpeedRating`)}
              placeholder="95W"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Ply Rating</label>
            <input
              {...register(`variants.${index}.plyRating`)}
              placeholder="10PR"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Load Range</label>
            <input
              {...register(`variants.${index}.loadRange`)}
              placeholder="E"
              className={inputCls}
            />
          </div>
          <div className="flex items-center gap-2 pt-5">
            <input
              type="checkbox"
              id={`xl-${index}`}
              {...register(`variants.${index}.xlReinforced`)}
              className="rounded border-zinc-300"
            />
            <label htmlFor={`xl-${index}`} className="text-sm text-zinc-700">
              XL Reinforced
            </label>
          </div>
        </div>
      </div>

      {/* ── Sidewall & Tube ───────────────────────────────────────── */}
      <div>
        <p className={sectionHdrCls}>Sidewall &amp; Tube</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <label className={labelCls}>Sidewall</label>
            <select {...register(`variants.${index}.sidewall`)} className={selectCls}>
              <option value="">—</option>
              {(['BSW', 'OWL', 'RWL'] as const).map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Tube Type</label>
            <select {...register(`variants.${index}.tubeType`)} className={selectCls}>
              <option value="">—</option>
              <option value="tubeless">Tubeless</option>
              <option value="tube_type">Tube Type</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── Physical Specifications ───────────────────────────────── */}
      <div>
        <p className={sectionHdrCls}>Physical Specifications</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <div>
            <label className={labelCls}>Section Width (mm)</label>
            <input
              type="number"
              {...register(`variants.${index}.sectionWidth`, { valueAsNumber: true })}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Tread Depth (mm)</label>
            <input
              type="number"
              {...register(`variants.${index}.treadDepth`, { valueAsNumber: true })}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Weight (kg)</label>
            <input
              type="number"
              {...register(`variants.${index}.tyreWeight`, { valueAsNumber: true })}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Overall Diameter (mm)</label>
            <input
              type="number"
              {...register(`variants.${index}.overallDiameter`, { valueAsNumber: true })}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Max Load</label>
            <input
              {...register(`variants.${index}.maxLoad`)}
              placeholder="750kg"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Max Pressure</label>
            <input
              {...register(`variants.${index}.maxPressure`)}
              placeholder="51psi"
              className={inputCls}
            />
          </div>
        </div>
      </div>

      {/* ── Manufacturing ─────────────────────────────────────────── */}
      <div>
        <p className={sectionHdrCls}>Manufacturing</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className={labelCls}>Manufacturer Name</label>
            <input
              {...register(`variants.${index}.manufacturerName`)}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Factory Name</label>
            <input
              {...register(`variants.${index}.factoryName`)}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Factory Country</label>
            <input
              {...register(`variants.${index}.factoryCountry`)}
              placeholder="CN"
              maxLength={3}
              className={`${inputCls} uppercase`}
            />
          </div>
        </div>
      </div>

      {/* ── Compliance & Ratings ──────────────────────────────────── */}
      <div>
        <p className={sectionHdrCls}>Compliance &amp; Ratings</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <label className={labelCls}>Noise Class</label>
            <input
              {...register(`variants.${index}.noiseClass`)}
              placeholder="A"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>E-Mark</label>
            <input
              {...register(`variants.${index}.eMark`)}
              placeholder="E4 123456"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>DOT Code</label>
            <input
              {...register(`variants.${index}.dotCode`)}
              placeholder="XXXX XXX 2024"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>UTQG</label>
            <input
              {...register(`variants.${index}.utqg`)}
              placeholder="500 A A"
              className={inputCls}
            />
          </div>
        </div>
      </div>

      {/* ── SKU Status ────────────────────────────────────────────── */}
      <div>
        <p className={sectionHdrCls}>SKU Status</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Status</label>
            <select {...register(`variants.${index}.status`)} className={selectCls}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="discontinued">Discontinued</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>
              Replacement Product ID{' '}
              <span className="font-normal text-zinc-400">(if discontinued)</span>
            </label>
            <input
              {...register(`variants.${index}.replacementProductId`)}
              placeholder="UUID of replacement SKU"
              className={inputCls}
            />
          </div>
        </div>
      </div>

      {/* ── Variant Images ────────────────────────────────────────── */}
      <div>
        <p className={sectionHdrCls}>Variant Images</p>
        <div className="space-y-2">
          {variantImages.map((url, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                value={url}
                readOnly
                className="flex-1 rounded border border-zinc-200 px-2 py-1.5 text-sm bg-zinc-50 text-zinc-600"
              />
              <button
                type="button"
                onClick={() => removeImage(i)}
                className="shrink-0 rounded p-1 text-red-400 hover:text-red-600 hover:bg-red-50"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
          <div className="flex items-center gap-2">
            <input
              value={newUrl}
              onChange={e => setNewUrl(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') { e.preventDefault(); addImage() }
              }}
              placeholder="https://cdn.example.com/image.jpg"
              className="flex-1 rounded border border-zinc-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <button
              type="button"
              onClick={addImage}
              className="shrink-0 rounded border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
            >
              Add
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

