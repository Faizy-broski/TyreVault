"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import {
  ClipboardList,
  LayoutDashboard,
  Truck,
  Archive,
  Users,
  Tag,
  CircleDollarSign,
  Wrench,
  Gauge,
  Settings,
  LogOut,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

const nav = [
  {
    label: "Dashboard",
    href: "/admin/dashboard",
    icon: Gauge,
  },
  {
    label: "Orders",
    href: "/admin/orders",
    icon: ClipboardList,
  },
  {
    label: "Products",
    href: "/admin/products",
    icon: LayoutDashboard,
    children: [
      { label: "Collection", href: "/admin/products/collections" },
      { label: "Categories", href: "/admin/products/categories" },
    ],
  },
  {
    label: "Suppliers",
    href: "/admin/suppliers",
    icon: Truck,
  },
  {
    label: "Inventory",
    href: "/admin/inventory",
    icon: Archive,
  },
  {
    label: "Customers",
    href: "/admin/customers",
    icon: Users,
    children: [{ label: "Customer Groups", href: "/admin/customers/groups" }],
  },
  {
    label: "Promotions",
    href: "/admin/promotions",
    icon: Tag,
  },
  {
    label: "Price Lists",
    href: "/admin/pricing",
    icon: CircleDollarSign,
  },
  {
    label: "Fitment Center",
    href: "/admin/fitters",
    icon: Wrench,
    children: [
      { label: "Applications", href: "/admin/fitters/applications" },
      { label: "Registered Centres", href: "/admin/fitters/centres" },
    ],
  },
];

interface Props {
  userEmail: string;
  isOpen?: boolean;
  onClose?: () => void;
}

export default function AdminSidebar({ userEmail, isOpen = false, onClose }: Props) {
  const pathname = usePathname();
  const router = useRouter();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  }

  return (
    // <aside className="w-56 flex flex-col border-r border-zinc-200 bg-white h-full">
    //   {/* Store name */}
    //   <div className="flex items-center gap-2 px-4 py-4 border-b border-zinc-200">
    //     <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
    //       <div className="w-2 h-2 rounded-full bg-white" />
    //     </div>
    //     <span className="text-sm font-medium text-zinc-800">Tyre Vault</span>
    //   </div>

    //   {/* Nav */}
    //   <nav className="flex-1 overflow-y-auto py-3 px-2">
    //     {nav.map((item) => {
    //       const isActive = pathname.startsWith(item.href)
    //       const Icon     = item.icon
    //       return (
    //         <div key={item.href}>
    //           <Link
    //             href={item.href}
    //             className={cn(
    //               'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors',
    //               isActive
    //                 ? 'bg-zinc-100 text-zinc-900 font-medium'
    //                 : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900'
    //             )}
    //           >
    //             <Icon className="w-4 h-4 shrink-0" />
    //             {item.label}
    //           </Link>
    //           {item.children && isActive && (
    //             <div className="ml-6 mt-0.5 space-y-0.5">
    //               {item.children.map(child => (
    //                 <Link
    //                   key={child.href}
    //                   href={child.href}
    //                   className={cn(
    //                     'block rounded-md px-3 py-1.5 text-sm transition-colors',
    //                     pathname === child.href
    //                       ? 'text-zinc-900 font-medium'
    //                       : 'text-zinc-500 hover:text-zinc-900'
    //                   )}
    //                 >
    //                   {child.label}
    //                 </Link>
    //               ))}
    //             </div>
    //           )}
    //         </div>
    //       )
    //     })}
    //   </nav>

    //   {/* Bottom: settings + user */}
    //   <div className="border-t border-zinc-200 px-2 py-3 space-y-0.5">
    //     <Link
    //       href="/admin/settings"
    //       className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 transition-colors"
    //     >
    //       <Settings className="w-4 h-4 shrink-0" />
    //       Settings
    //     </Link>

    //     <div className="flex items-center gap-2.5 px-3 py-2 rounded-md">
    //       <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center text-white text-xs font-medium shrink-0">
    //         {userEmail.charAt(0).toUpperCase()}
    //       </div>
    //       <span className="text-xs text-zinc-500 truncate flex-1">{userEmail}</span>
    //       <button
    //         type="button"
    //         onClick={signOut}
    //         title="Sign out"
    //         className="shrink-0 text-zinc-400 hover:text-zinc-700 transition-colors"
    //       >
    //         <LogOut className="w-4 h-4" />
    //       </button>
    //     </div>
    //   </div>
    // </aside>
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-30 w-64 flex flex-col bg-white border-r border-zinc-200 transition-transform duration-200 ease-in-out",
        "lg:relative lg:w-44 lg:translate-x-0 lg:shrink-0",
        isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
      )}
    >
      {/* Logo */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-200 shadow-sm">
        <Link href="/admin/dashboard">
          <Image src="/logo_dark.svg" width={300} height={300} alt="Logo" />
        </Link>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onClose}
          aria-label="Close menu"
          className="lg:hidden"
        >
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {nav.map((item) => {
          const active = pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <div key={item.href}>
              <Link
                href={item.href}
                onClick={onClose}
                className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150 ${
                  active
                    ? "bg-primary text-zinc-900 shadow-sm"
                    : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {item.label}
              </Link>
              {item.children && active && (
                <div className="ml-6 mt-0.5 space-y-0.5">
                  {item.children.map((child) => (
                    <Link
                      key={child.href}
                      href={child.href}
                      onClick={onClose}
                      className={cn(
                        "block rounded-md px-3 py-1.5 text-sm transition-colors",
                        pathname === child.href
                          ? "text-zinc-900 bg-primary/40 font-medium"
                          : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900",
                      )}
                    >
                      {child.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <p className="px-4 py-3 text-[10px] text-zinc-400 border-t border-zinc-100">
        © 2025 Tyre Fitment Portal
      </p>
    </aside>
  );
}
