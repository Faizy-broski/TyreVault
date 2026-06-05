"use client";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronDown, Menu, Search, ShoppingCart, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCartStore } from "@/stores/cart.store";

const navLinks = [
  { label: "Shop Tyres", href: "/tyres", chevron: false },
  { label: "Accessories", href: "#",     chevron: false },
  { label: "Deals",       href: "#",     chevron: false },
];

export default function Navbar({ topbarScrolled }: { topbarScrolled: boolean }) {
  const { openCart, itemCount } = useCartStore();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  const count = mounted ? itemCount() : 0;

  return (
    <header
      className={`fixed left-0 right-0 z-50 w-full text-white transition-[top] duration-300 ${topbarScrolled ? "top-0" : "top-10"}`}
    >
      <div className="border-b border-white/10 bg-black/30 backdrop-blur-md">
        <div className="mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-10">
          <div className="flex items-center gap-5 lg:gap-10">
            <Button
              size="icon"
              variant="outline"
              aria-label="Open menu"
              className="h-10 w-10 rounded-full border-white/20 bg-transparent text-white hover:border-primary hover:bg-primary/10 hover:text-primary"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <nav className="hidden items-center gap-8 lg:flex">
              {navLinks.map(({ label, href, chevron }) => (
                <Link
                  key={label}
                  href={href}
                  className="group flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-white transition-colors duration-200 hover:text-primary"
                >
                  {label}
                  {chevron && <ChevronDown className="h-3.5 w-3.5" />}
                </Link>
              ))}
            </nav>
          </div>

          <Link href="/" className="absolute left-1/2 hidden -translate-x-1/2 lg:block">
            <Image src="/logo.svg" width={180} height={45} alt="Tyre Vault" style={{ height: 'auto' }} />
          </Link>
          <Link href="/" className="lg:hidden">
            <Image src="/logo.svg" width={140} height={35} alt="Tyre Vault" style={{ height: 'auto' }} />
          </Link>

          <div className="flex items-center gap-2">
            <div className="hidden items-center gap-1 lg:flex">
              <Link href="/login">
                <Button size="icon" variant="ghost" aria-label="Account" className="text-white hover:bg-transparent hover:text-primary">
                  <User className="h-5 w-5" />
                </Button>
              </Link>
              <div className="h-5 w-px bg-white/20" />
              <button
                type="button"
                onClick={openCart}
                aria-label="Open cart"
                className="relative flex items-center justify-center h-10 w-10 rounded-lg text-white hover:text-primary transition-colors"
              >
                <ShoppingCart className="h-5 w-5" />
                {count > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-primary text-[10px] font-bold text-zinc-900 px-1">
                    {count > 99 ? "99+" : count}
                  </span>
                )}
              </button>
            </div>
            <div className="relative hidden lg:block">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <Input
                placeholder="Search tyres..."
                className="h-10 w-64 rounded-full border-white/15 bg-white/5 pl-11 text-sm text-white placeholder:text-zinc-500 focus-visible:ring-1 focus-visible:ring-primary"
              />
            </div>
            {/* Mobile cart */}
            <button
              type="button"
              onClick={openCart}
              aria-label="Open cart"
              className="relative flex items-center justify-center h-10 w-10 rounded-lg text-white hover:text-primary transition-colors lg:hidden"
            >
              <ShoppingCart className="h-5 w-5" />
              {count > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-primary text-[10px] font-bold text-zinc-900 px-1">
                  {count > 99 ? "99+" : count}
                </span>
              )}
            </button>
            <Button size="icon" variant="ghost" aria-label="Search" className="text-white hover:bg-transparent hover:text-primary lg:hidden">
              <Search className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}

