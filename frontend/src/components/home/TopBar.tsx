"use client";
import { Mail, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function TopBar() {
  return (
    <div className="bg-[#050505]">
      <div className="mx-auto flex h-10 items-center justify-between px-4 sm:px-6 lg:px-10">
        <div className="hidden items-center gap-2 text-sm text-zinc-300 sm:flex">
          <Mail className="h-4 w-4 shrink-0" />
          <span>support@tyrevault.com.au</span>
        </div>
        <div className="hidden items-center gap-4 text-sm text-zinc-300 xl:flex">
          <span>Free shipping on all orders</span>
          <span className="text-primary">|</span>
          <span>4.8 ★ ShopperApproved rating</span>
        </div>
        <div className="flex items-center">
          <span className="hidden px-4 text-sm text-zinc-300 lg:inline">Customer Support</span>
          <Button className="h-10 rounded-none bg-primary px-4 text-sm font-semibold text-white transition-all duration-200 hover:bg-[#c89907] active:scale-[0.97]">
            <Phone className="mr-1.5 h-3.5 w-3.5" />
            666-333-7777
          </Button>
        </div>
      </div>
    </div>
  );
}

