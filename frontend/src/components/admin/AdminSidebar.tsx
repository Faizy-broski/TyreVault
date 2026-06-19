"use client";

import { useState, useEffect } from "react";
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
  X,
  ShoppingCart,
  PackageOpen,
  CircleDot,
  Car,
  Ship,
  ChevronRight,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { createClient } from "@/lib/supabase/client";

const nav = [
  { label: "Dashboard",       href: "/admin/dashboard",       icon: Gauge },
  { label: "Orders",          href: "/admin/orders",           icon: ClipboardList },
  {
    label: "Products", href: "/admin/products", icon: LayoutDashboard,
    children: [
      { label: "Brands",      href: "/admin/products/brands" },
      { label: "Patterns",    href: "/admin/products/patterns" },
      // { label: "Collection",  href: "/admin/products/collections" },
      { label: "Categories",  href: "/admin/products/categories" },
      { label: "Warehouses",  href: "/admin/warehouses" },
    ],
  },
  { label: "Suppliers",       href: "/admin/suppliers",        icon: Truck },
  { label: "Inventory",       href: "/admin/inventory",        icon: Archive },
  {
    label: "Customers", href: "/admin/customers", icon: Users,
    children: [{ label: "Customer Groups", href: "/admin/customers/groups" }],
  },
  { label: "Promotions",      href: "/admin/promotions",       icon: Tag },
  { label: "Price Lists",     href: "/admin/pricing",          icon: CircleDollarSign },
  { label: "Purchase Orders", href: "/admin/purchase-orders",  icon: ShoppingCart },
  { label: "Shipments",       href: "/admin/shipments",        icon: PackageOpen },
  {
    label: "Wheels", href: "/admin/wheels", icon: CircleDot,
    children: [{ label: "Brands", href: "/admin/wheels/brands" }],
  },
  { label: "Vehicles",        href: "/admin/vehicles",         icon: Car },
  { label: "Shipping Methods",href: "/admin/shipping-methods", icon: Ship },
  {
    label: "Fitment Center", href: "/admin/fitters", icon: Wrench, noNav: true,
    children: [
      { label: "Applications",       href: "/admin/fitters/applications" },
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
  const router   = useRouter();

  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    for (const item of nav) {
      if (item.children && pathname.startsWith(item.href)) init[item.href] = true;
    }
    return init;
  });

  useEffect(() => {
    setExpanded(prev => {
      const next = { ...prev };
      for (const item of nav) {
        if (item.children && pathname.startsWith(item.href)) next[item.href] = true;
      }
      return next;
    });
  }, [pathname]);

  function toggle(href: string) {
    setExpanded(prev => ({ ...prev, [href]: !prev[href] }));
  }

  async function signOut() {
    await createClient().auth.signOut();
    router.push("/");
  }

  const initials    = userEmail.slice(0, 2).toUpperCase();
  const displayName = userEmail.split("@")[0].split(".").map(w => w[0].toUpperCase() + w.slice(1)).join(" ");

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-30 w-60 flex flex-col transition-transform duration-200 ease-in-out",
        "bg-zinc-950 text-zinc-400",
        "lg:relative lg:translate-x-0 lg:shrink-0",
        isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
      )}
    >
      {/* Logo area */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
        <Link href="/admin/dashboard">
          <Image src="/logo.svg" width={150} height={46} alt="Tyre Vault" />
        </Link>
        <button
          type="button"
          onClick={onClose}
          className="lg:hidden rounded-lg p-1 text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors"
          aria-label="Close menu"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
        {nav.map((item) => {
          const active      = pathname.startsWith(item.href);
          const Icon        = item.icon;
          const hasChildren = Boolean(item.children?.length);
          const open        = Boolean(expanded[item.href]);
          const noNav       = Boolean((item as { noNav?: boolean }).noNav);

          return (
            <div key={item.href}>
              {/* Parent row */}
              <div
                className={cn(
                  "flex items-center rounded-lg text-sm font-medium transition-all duration-150 group",
                  active
                    ? "bg-primary/20 text-primary"
                    : "text-zinc-300 hover:bg-zinc-800/70 hover:text-white",
                )}
              >
                {noNav ? (
                  <button
                    type="button"
                    onClick={() => toggle(item.href)}
                    className="flex items-center gap-3 flex-1 px-3 py-2.5 min-w-0 text-left"
                  >
                    <Icon className={cn("w-4 h-4 shrink-0", active ? "text-primary" : "text-zinc-400 group-hover:text-white")} />
                    <span className="truncate text-[13px]">{item.label}</span>
                  </button>
                ) : (
                  <Link
                    href={item.href}
                    onClick={() => {
                      onClose?.();
                      if (hasChildren) setExpanded(prev => ({ ...prev, [item.href]: true }));
                    }}
                    className="flex items-center gap-3 flex-1 px-3 py-2.5 min-w-0"
                  >
                    <Icon className={cn("w-4 h-4 shrink-0", active ? "text-primary" : "text-zinc-400 group-hover:text-white")} />
                    <span className="truncate text-[13px]">{item.label}</span>
                    {active && !hasChildren && (
                      <span className="ml-auto w-1 h-4 rounded-full bg-primary shrink-0" />
                    )}
                  </Link>
                )}

                {hasChildren && (
                  <button
                    type="button"
                    aria-label={open ? "Collapse" : "Expand"}
                    onClick={() => toggle(item.href)}
                    className="pr-3 pl-1 py-2 shrink-0 text-zinc-500 hover:text-white transition-colors"
                  >
                    <ChevronRight
                      className={cn("w-3.5 h-3.5 transition-transform duration-200", open ? "rotate-90" : "rotate-0")}
                    />
                  </button>
                )}
              </div>

              {/* Submenu */}
              {hasChildren && (
                <div
                  className={cn(
                    "grid transition-[grid-template-rows] duration-200 ease-in-out",
                    open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
                  )}
                >
                  <div className="overflow-hidden">
                    <div className="ml-4 pl-3 mt-1 mb-1.5 space-y-0.5 border-l border-zinc-800">
                      {item.children!.map((child) => {
                        const childActive = pathname === child.href || pathname.startsWith(child.href + "/");
                        return (
                          <Link
                            key={child.href}
                            href={child.href}
                            onClick={onClose}
                            className={cn(
                              "flex items-center gap-2 rounded-md px-3 py-1.5 text-[12px] transition-colors duration-100",
                              childActive
                                ? "text-primary font-semibold bg-primary/10"
                                : "text-zinc-400 hover:text-white hover:bg-zinc-800/60",
                            )}
                          >
                            <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", childActive ? "bg-primary" : "bg-zinc-700")} />
                            {child.label}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Bottom user strip */}
      <div className="border-t border-zinc-800 px-3 py-3">
        <div className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-zinc-800/60 transition-colors group">
          <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-[11px] font-bold text-zinc-900 shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-zinc-200 text-[12px] font-medium truncate">{displayName}</p>
            <p className="text-zinc-500 text-[10px] truncate">{userEmail}</p>
          </div>
          <button
            type="button"
            onClick={signOut}
            title="Sign out"
            className="text-zinc-600 hover:text-red-400 transition-colors shrink-0"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
