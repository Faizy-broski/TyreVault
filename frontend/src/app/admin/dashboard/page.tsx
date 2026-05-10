import Link from 'next/link'

const cards = [
  { label: 'Products',   href: '/admin/products',          icon: '📦', desc: 'Manage SKUs, brands & patterns' },
  { label: 'Orders',     href: '/admin/orders',             icon: '🛒', desc: 'View and manage customer orders' },
  { label: 'Customers',  href: '/admin/customers',          icon: '👥', desc: 'Customer accounts & groups' },
  { label: 'Fitters',    href: '/admin/fitters',            icon: '🔧', desc: 'Fitment centre applications' },
]

export default function AdminDashboard() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-900">Admin Dashboard</h1>
        <p className="text-sm text-zinc-500 mt-1">Welcome back. Select a section to manage.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 max-w-2xl">
        {cards.map(card => (
          <Link
            key={card.href}
            href={card.href}
            className="rounded-xl border border-zinc-200 bg-white p-5 hover:border-zinc-300 hover:shadow-sm transition-all"
          >
            <div className="text-2xl mb-2">{card.icon}</div>
            <p className="font-semibold text-zinc-900">{card.label}</p>
            <p className="text-xs text-zinc-500 mt-0.5">{card.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
