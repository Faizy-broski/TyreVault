"use client";
import Image from "next/image";
import Link from "next/link";
import { ShoppingCart, Package, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCartStore } from "@/stores/cart.store";

export interface BestSellerSku {
  product_id:        string;
  sku:               string;
  product_slug:      string | null;
  tyre_size_display: string;
  brand_name:        string;
  pattern_name:      string;
  main_image:        string | null;
  price_inc_gst:     number | null;
  total_available_stock: number;
  xl_reinforced:     boolean;
  runflat:           boolean;
}

export default function TyreCard({ item }: { item: BestSellerSku }) {
  const addItem = useCartStore((s) => s.addItem);

  const href = item.product_slug ? `/tyres/${item.product_slug}` : `/tyres?q=${encodeURIComponent(item.pattern_name)}`;
  const inStock = item.total_available_stock > 0;

  function handleAddToCart(e: React.MouseEvent) {
    e.preventDefault();
    if (!inStock || item.price_inc_gst == null) return;
    addItem({
      id:    item.product_id,
      sku:   item.sku,
      name:  `${item.brand_name} ${item.pattern_name}`,
      size:  item.tyre_size_display,
      price: item.price_inc_gst,
      image: item.main_image && item.main_image.startsWith("http") ? item.main_image : null,
      stock: item.total_available_stock,
    });
  }

  return (
    <Link href={href} className="block group">
      <div className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-zinc-300">

        {/* Image area */}
        <div className="relative flex h-52 items-center justify-center bg-gradient-to-b from-zinc-50 to-white border-b border-zinc-100">
          {/* Badges */}
          <div className="absolute left-3 top-3 z-10 flex flex-col gap-1.5">
            {item.runflat && (
              <span className="rounded-md bg-zinc-900 px-2 py-0.5 text-[10px] font-bold text-white tracking-wide">Runflat</span>
            )}
            {item.xl_reinforced && (
              <span className="rounded-md bg-primary px-2 py-0.5 text-[10px] font-bold text-zinc-900 tracking-wide">XL</span>
            )}
          </div>

          {/* Stock badge */}
          <div className="absolute right-3 top-3 z-10">
            {inStock ? (
              <span className="flex items-center gap-1 rounded-md bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                In Stock
              </span>
            ) : (
              <span className="flex items-center gap-1 rounded-md bg-red-50 border border-red-200 px-2 py-0.5 text-[10px] font-semibold text-red-600">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                Out of Stock
              </span>
            )}
          </div>

          {item.main_image && item.main_image.startsWith("http") ? (
            <Image
              src={item.main_image}
              alt={item.pattern_name}
              width={180}
              height={180}
              className="object-contain transition-transform duration-500 group-hover:scale-105 drop-shadow-sm"
            />
          ) : (
            <div className="flex h-28 w-28 items-center justify-center rounded-full border-2 border-dashed border-zinc-200">
              <Package className="w-8 h-8 text-zinc-300" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Brand */}
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-400">{item.brand_name}</p>

          {/* Pattern name */}
          <h3 className="mt-0.5 font-oswald text-xl font-black leading-tight tracking-tight text-zinc-900 group-hover:text-zinc-700 transition-colors line-clamp-1">
            {item.pattern_name}
          </h3>

          {/* Size */}
          <div className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-zinc-100 px-2 py-1">
            <span className="text-[11px] font-semibold text-zinc-600 font-mono">{item.tyre_size_display}</span>
          </div>

          {/* Rating placeholder */}
          <div className="mt-2 flex items-center gap-1">
            {[1,2,3,4,5].map(s => (
              <Star key={s} className="w-3 h-3 fill-primary text-primary" />
            ))}
            <span className="text-[11px] text-zinc-400 ml-1">5.0</span>
          </div>

          {/* Price + CTA */}
          <div className="mt-3 flex items-center justify-between gap-3">
            <div>
              {item.price_inc_gst != null ? (
                <>
                  <span className="text-xl font-extrabold text-zinc-900 tracking-tight">
                    ${item.price_inc_gst.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <span className="block text-[10px] text-zinc-400 font-medium">inc. GST / ea</span>
                </>
              ) : (
                <span className="text-sm italic text-zinc-400">Price on request</span>
              )}
            </div>

            <Button
              onClick={handleAddToCart}
              disabled={!inStock || item.price_inc_gst == null}
              size="sm"
              className="h-9 rounded-xl bg-primary px-4 text-xs font-bold text-zinc-900 hover:bg-primary/90 active:scale-95 disabled:opacity-40 transition-all duration-200 shrink-0"
            >
              <ShoppingCart className="mr-1.5 h-3.5 w-3.5" />
              Add
            </Button>
          </div>
        </div>
      </div>
    </Link>
  );
}

