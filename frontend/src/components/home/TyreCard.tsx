"use client";
import Image from "next/image";
import { ShoppingCart, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { Tyre } from "./data";

export default function TyreCard({ item }: { item: Tyre }) {
  return (
    <Card className="group overflow-hidden rounded-3xl border border-black/5 bg-[#fbfbfb] shadow-none transition-all duration-300 hover:bg-white hover:shadow-[0_12px_32px_rgba(0,0,0,0.08)]">
      <CardContent className="p-0">
        <div className="relative flex h-60 items-center justify-center border-b border-black/5 bg-white">
          <span className="absolute left-4 top-4 z-10 rounded-full bg-primary px-3 py-1 text-[11px] font-bold text-white">
            {item.discount}
          </span>
          <Image
            src={item.image}
            alt={item.name}
            width={200}
            height={200}
            className="object-contain transition-transform duration-500 group-hover:scale-105"
          />
        </div>
        <div className="p-5">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-widest text-black/35">{item.brand}</p>
              <h3 className="mt-1 font-oswald text-2xl font-black leading-none tracking-tight text-black">{item.name}</h3>
              <p className="mt-1.5 text-sm text-black/45">{item.size}</p>
            </div>
            <div className="mt-0.5 flex shrink-0 items-center gap-1">
              <Star className="h-3 w-3 fill-primary text-primary" />
              <span className="text-xs font-semibold text-black/80">{item.rating}</span>
              <span className="text-xs text-black/35">{item.reviews}</span>
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="font-oswald text-3xl font-black tracking-tight text-black">{item.price}</span>
            <span className="text-xs text-black/30 line-through">{item.oldPrice}</span>
          </div>
          <Button className="mt-4 h-10 w-full rounded-full bg-primary text-sm font-semibold text-white transition-all duration-200 hover:bg-[#c89907] active:scale-[0.97]">
            <ShoppingCart className="mr-2 h-3.5 w-3.5" />
            Add to Cart
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
