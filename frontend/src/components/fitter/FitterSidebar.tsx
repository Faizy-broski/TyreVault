"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import {
  LayoutDashboard,
  CalendarDays,
  CircleDollarSign,
  Tag,
  Wrench,
  UserRound,
  LifeBuoy,
} from "lucide-react";

const NAV = [
  { label: "Dashboard", href: "/fitter/dashboard", icon: LayoutDashboard },
  { label: "Schedule", href: "/fitter/schedule", icon: CalendarDays },
  { label: "Earnings", href: "/fitter/earnings", icon: CircleDollarSign },
  { label: "Pricing", href: "/fitter/pricing", icon: Tag },
  { label: "Services", href: "/fitter/services", icon: Wrench },
  { label: "Profile & Setting", href: "/fitter/profile", icon: UserRound },
  { label: "Support", href: "/fitter/support", icon: LifeBuoy },
];

export default function FitterSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-44 flex flex-col bg-white border-r border-zinc-200 h-full shrink-0">
      {/* Logo */}
      <div className="px-4 border-b border-zinc-100">
        <Link href="/fitter/dashboard">
          <Image src="/logo.svg" width={200} height={200} alt="Logo" />
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {NAV.map(({ label, href, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                active
                  ? "bg-primary text-zinc-900"
                  : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      <p className="px-4 py-3 text-[10px] text-zinc-400 border-t border-zinc-100">
        © 2025 Tyre Fitment Portal
      </p>
    </aside>
  );
}
