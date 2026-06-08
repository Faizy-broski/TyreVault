'use client'

import Link from 'next/link'

/* ── Inline vehicle line-art icons ── */
function IconCar({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 80 44" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 28h68M10 28V34M70 28V34" />
      <path d="M8 28L16 14h48l8 14" />
      <path d="M22 14l4-8h28l4 8" />
      <circle cx="20" cy="34" r="5" />
      <circle cx="60" cy="34" r="5" />
      <path d="M8 22h64" />
    </svg>
  )
}

function IconSUV({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 80 46" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="6" y="16" width="68" height="18" rx="2" />
      <path d="M12 16L18 6h44l8 10" />
      <path d="M6 28v6M74 28v6" />
      <circle cx="20" cy="36" r="5" />
      <circle cx="60" cy="36" r="5" />
      <path d="M6 22h68" />
      <path d="M30 6v10M50 6v10" />
    </svg>
  )
}

function IconOffRoad({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 80 50" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="16" width="72" height="20" rx="3" />
      <path d="M10 16L16 6h48l8 10" />
      <path d="M4 28v8M76 28v8" />
      <circle cx="18" cy="38" r="6" />
      <circle cx="62" cy="38" r="6" />
      <line x1="18" y1="32" x2="18" y2="44" />
      <line x1="12" y1="38" x2="24" y2="38" />
      <line x1="62" y1="32" x2="62" y2="44" />
      <line x1="56" y1="38" x2="68" y2="38" />
      <path d="M6 22h68" />
      <path d="M36 6v10" />
    </svg>
  )
}

function IconSports({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 80 40" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 28C4 28 8 16 20 13l20-5 20 3 12 17H4z" />
      <path d="M4 26h72M14 26v6M66 26v6" />
      <circle cx="22" cy="33" r="4.5" />
      <circle cx="58" cy="33" r="4.5" />
      <path d="M28 13l2 13M42 8l1 18" />
      <path d="M4 26l6-8" />
    </svg>
  )
}

function IconTruck({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 88 48" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="12" width="50" height="24" rx="2" />
      <path d="M54 18h18l10 14v6H54V18z" />
      <path d="M54 24h22" />
      <circle cx="16" cy="38" r="5" />
      <circle cx="44" cy="38" r="5" />
      <circle cx="72" cy="38" r="5" />
      <path d="M4 28h50" />
    </svg>
  )
}

function IconTyre({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="24" cy="24" r="20" />
      <circle cx="24" cy="24" r="10" />
      <line x1="24" y1="4"  x2="24" y2="14" />
      <line x1="24" y1="34" x2="24" y2="44" />
      <line x1="4"  y1="24" x2="14" y2="24" />
      <line x1="34" y1="24" x2="44" y2="24" />
      <line x1="8.7"  y1="8.7"  x2="15.8" y2="15.8" />
      <line x1="32.2" y1="32.2" x2="39.3" y2="39.3" />
      <line x1="39.3" y1="8.7"  x2="32.2" y2="15.8" />
      <line x1="15.8" y1="32.2" x2="8.7"  y2="39.3" />
    </svg>
  )
}


const CATEGORIES = [
  { label: 'Car Tyres',         sub: 'Passenger & hatchback',    Icon: IconCar,     href: '/tyres?app_type=PCR' },
  { label: 'SUV Tyres',         sub: 'Crossover & SUV',          Icon: IconSUV,     href: '/tyres?app_type=4x4' },
  { label: '4×4 / Off-Road',    sub: '4WD & off-road performance', Icon: IconOffRoad, href: '/tyres?app_type=4x4' },
  { label: 'Sports Tyres',      sub: 'High-performance grip',    Icon: IconSports,  href: '/tyres?app_type=PCR' },
  { label: 'Truck / Commercial',sub: 'Light & heavy commercial', Icon: IconTruck,   href: '/tyres?app_type=TBR' },
  { label: 'All Tyres',         sub: 'Browse the full range',    Icon: IconTyre,    href: '/tyres'               },
]

interface Props { onClose: () => void }

export default function TyresDropdown({ onClose }: Props) {
  return (
    <div className="absolute left-0 top-full mt-1 z-50 w-[560px] rounded-2xl border border-zinc-200 bg-white shadow-2xl overflow-hidden">

      {/* Header */}
      <div className="px-6 py-3.5 border-b border-zinc-100 flex items-center justify-between bg-zinc-50">
        <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">Shop by Vehicle Type</p>
        <Link href="/tyres" onClick={onClose} className="text-xs text-primary font-semibold hover:underline">
          View all tyres →
        </Link>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-3 divide-x divide-y divide-zinc-100">
        {CATEGORIES.map(({ label, sub, Icon, href }) => (
          <Link
            key={label}
            href={href}
            onClick={onClose}
            className="group flex flex-col items-center gap-3 px-5 py-6 hover:bg-primary/5 transition-colors text-center"
          >
            <Icon className="w-16 h-16 text-primary transition-colors" />
            <div>
              <p className="text-sm font-bold text-zinc-800 group-hover:text-primary transition-colors leading-snug">
                {label}
              </p>
              <p className="text-[11px] text-zinc-400 mt-0.5 leading-tight">{sub}</p>
            </div>
          </Link>
        ))}
      </div>

    </div>
  )
}
