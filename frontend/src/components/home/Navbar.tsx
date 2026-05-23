"use client";
import Image from "next/image";
import Link from "next/link";
import { ChevronDown, Menu, Search, ShoppingCart, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function Navbar({ topbarScrolled }: { topbarScrolled: boolean }) {
  return (
    <header
      className={`fixed left-0 right-0 z-50 w-full text-white transition-[top] duration-300 ${topbarScrolled ? "top-0" : "top-10"}`}
    >
      <div className="border-b border-white/10 bg-black/30 backdrop-blur-md">
        <div className="mx-auto flex h-20 max-w-[1400px] items-center justify-between px-4 sm:px-6 lg:px-10">
          <div className="flex items-center gap-5 lg:gap-10">
            <Button
              size="icon"
              variant="outline"
              aria-label="Open menu"
              className="h-12 w-12 rounded-full border-white/20 bg-transparent text-white hover:border-primary hover:bg-primary/10 hover:text-primary"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <nav className="hidden items-center gap-8 lg:flex">
              {[{ label: "Shop Tires", chevron: true }, { label: "Accessories" }, { label: "Deals" }].map(({ label, chevron }) => (
                <Link
                  key={label}
                  href="#"
                  className="group flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-white transition-colors duration-200 hover:text-primary"
                >
                  {label}
                  {chevron && <ChevronDown className="h-3.5 w-3.5" />}
                </Link>
              ))}
            </nav>
          </div>

          <div className="absolute left-1/2 hidden -translate-x-1/2 lg:block">
            <Image src="/logo.svg" width={240} height={60} alt="Tyre Vault" className="object-contain" />
          </div>
          <div className="lg:hidden">
            <Image src="/logo.svg" width={160} height={40} alt="Tyre Vault" className="object-contain" />
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden items-center gap-1 lg:flex">
              <Button size="icon" variant="ghost" aria-label="Account" className="text-white hover:bg-transparent hover:text-primary">
                <User className="h-5 w-5" />
              </Button>
              <div className="h-5 w-px bg-white/20" />
              <Button size="icon" variant="ghost" aria-label="Cart" className="text-white hover:bg-transparent hover:text-primary">
                <ShoppingCart className="h-5 w-5" />
              </Button>
            </div>
            <div className="relative hidden lg:block">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <Input
                placeholder="Search tyres..."
                className="h-11 w-64 rounded-full border-white/15 bg-white/5 pl-11 text-sm text-white placeholder:text-zinc-500 focus-visible:ring-1 focus-visible:ring-primary"
              />
            </div>
            <Button size="icon" variant="ghost" aria-label="Search" className="text-white hover:bg-transparent hover:text-primary lg:hidden">
              <Search className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
