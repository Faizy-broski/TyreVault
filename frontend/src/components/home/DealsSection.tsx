"use client";

import { useRef, useCallback } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import Autoplay from "embla-carousel-autoplay";
import useEmblaCarousel from "embla-carousel-react";
import { motion } from "framer-motion";
import { fadeUp, stagger, viewport } from "./motion-variants";
import { deals } from "./data";

export default function DealsSection() {
  const autoplay = useRef(Autoplay({ delay: 4500, stopOnInteraction: true }));
  const [emblaRef, emblaApi] = useEmblaCarousel(
    { align: "start", dragFree: true, loop: false },
    [autoplay.current],
  );
  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  return (
    <section className="overflow-hidden py-16 md:py-24">
      <div className="mx-auto max-w-[1400px]">
        <motion.div
          className="mb-10 flex items-start justify-between px-4 sm:px-6 lg:px-10"
          initial="hidden"
          whileInView="visible"
          viewport={viewport}
          variants={stagger}
        >
          <motion.div variants={fadeUp}>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Limited Time</p>
            <h2 className="mt-2 font-oswald text-3xl font-black tracking-tight text-black sm:text-4xl">Deals & Offers</h2>
            <p className="mt-2 text-base text-black/65">Get cash back directly from the manufacturer!</p>
          </motion.div>
          <motion.div variants={fadeUp} className="hidden shrink-0 items-center gap-3 md:flex">
            <Button
              size="icon"
              variant="outline"
              aria-label="Previous deal"
              onClick={scrollPrev}
              className="h-10 w-10 rounded-full border-primary bg-transparent text-primary hover:bg-primary/10"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              aria-label="Next deal"
              onClick={scrollNext}
              className="h-10 w-10 rounded-full bg-primary text-white hover:bg-[#c89907]"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </motion.div>
        </motion.div>

        <div className="overflow-hidden pl-4 sm:pl-6 lg:pl-10" ref={emblaRef}>
          <div className="flex gap-4">
            {deals.map((deal, index) => (
              <div
                key={index}
                className="min-w-[240px] flex-[0_0_240px] sm:min-w-[265px] sm:flex-[0_0_265px] md:min-w-[285px] md:flex-[0_0_285px]"
              >
                <Card className="group relative overflow-hidden rounded-3xl border-0 bg-black shadow-none">
                  <div className="relative h-[340px]">
                    <Image
                      src={deal.image}
                      alt={deal.title}
                      fill
                      className="object-cover transition duration-700 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/35 to-black/10" />
                    <div className="absolute left-4 top-4 flex w-[calc(100%-32px)] items-start justify-between">
                      <div className="rounded-full bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-black">
                        NOKIAN TYRES
                      </div>
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-black">
                        <Info className="h-3.5 w-3.5" />
                      </div>
                    </div>
                    <div className="absolute bottom-0 left-0 w-full p-5">
                      <p className="text-sm text-white/80">{deal.brand}</p>
                      <h3 className="mt-1 font-oswald text-3xl font-black leading-none tracking-tight text-white">{deal.title}</h3>
                      <p className="mt-2 text-xs text-white/55">{deal.date}</p>
                    </div>
                  </div>
                </Card>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
