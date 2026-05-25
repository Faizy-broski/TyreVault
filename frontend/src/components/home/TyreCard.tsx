"use client";
import Image from "next/image";
import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
    <Link href={href}>
      <Card className="group overflow-hidden rounded-3xl border border-black/5 bg-[#fbfbfb] shadow-none transition-all duration-300 hover:bg-white hover:shadow-[0_12px_32px_rgba(0,0,0,0.08)]">
        <CardContent className="p-0">
          <div className="relative flex h-60 items-center justify-center border-b border-black/5 bg-white">
            {(item.xl_reinforced || item.runflat) && (
              <span className="absolute left-4 top-4 z-10 rounded-full bg-primary px-3 py-1 text-[11px] font-bold text-zinc-900">
                {item.runflat ? "Runflat" : "XL"}
              </span>
            )}
            {item.main_image && item.main_image.startsWith("http") ? (
              <Image
                src={item.main_image}
                alt={item.pattern_name}
                width={200}
                height={200}
                className="object-contain transition-transform duration-500 group-hover:scale-105"
              />
            ) : (
              <div className="flex h-32 w-32 items-center justify-center rounded-full border-[3px] border-zinc-200 opacity-40" />
            )}
          </div>

          <div className="p-5">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-widest text-black/35">{item.brand_name}</p>
              <h3 className="mt-1 font-oswald text-2xl font-black leading-none tracking-tight text-black">{item.pattern_name}</h3>
              <p className="mt-1.5 text-sm text-black/45">{item.tyre_size_display}</p>
            </div>

            <div className="mt-4 flex items-baseline gap-2">
              {item.price_inc_gst != null ? (
                <span className="font-oswald text-3xl font-black tracking-tight text-black">
                  ${item.price_inc_gst.toFixed(2)}
                </span>
              ) : (
                <span className="text-sm italic text-black/40">Price on request</span>
              )}
            </div>

            <Button
              onClick={handleAddToCart}
              disabled={!inStock || item.price_inc_gst == null}
              className="mt-4 h-10 w-full rounded-full bg-primary text-sm font-semibold text-zinc-900 transition-all duration-200 hover:bg-[#c89907] active:scale-[0.97] disabled:opacity-40"
            >
              <ShoppingCart className="mr-2 h-3.5 w-3.5" />
              {inStock ? "Add to Cart" : "Out of Stock"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
