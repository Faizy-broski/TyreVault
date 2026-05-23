"use client";

import { useState, useCallback, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import useEmblaCarousel from "embla-carousel-react";
import { motion } from "framer-motion";
import { fadeUp, stagger, viewport } from "./motion-variants";
import { tyrePages } from "./data";
import TyreCard from "./TyreCard";

export default function BestSellingSection() {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollSnaps, setScrollSnaps] = useState<number[]>([]);
  const [tyresEmblaRef, tyresEmblaApi] = useEmblaCarousel({ align: "start", dragFree: false });

  const tyresScrollPrev = useCallback(() => tyresEmblaApi?.scrollPrev(), [tyresEmblaApi]);
  const tyresScrollNext = useCallback(() => tyresEmblaApi?.scrollNext(), [tyresEmblaApi]);

  const onTyresInit = useCallback(() => {
    if (!tyresEmblaApi) return;
    setScrollSnaps(tyresEmblaApi.scrollSnapList());
  }, [tyresEmblaApi]);

  const onTyresSelect = useCallback(() => {
    if (!tyresEmblaApi) return;
    setSelectedIndex(tyresEmblaApi.selectedScrollSnap());
  }, [tyresEmblaApi]);

  useEffect(() => {
    if (!tyresEmblaApi) return;
    onTyresInit();
    onTyresSelect();
    tyresEmblaApi.on("reInit", onTyresInit);
    tyresEmblaApi.on("select", onTyresSelect);
    return () => {
      tyresEmblaApi.off("reInit", onTyresInit);
      tyresEmblaApi.off("select", onTyresSelect);
    };
  }, [tyresEmblaApi, onTyresInit, onTyresSelect]);

  return (
    <section className="overflow-hidden py-16 md:py-24">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-10">
        <div className="flex items-start justify-between">
          <motion.div initial="hidden" whileInView="visible" viewport={viewport} variants={stagger}>
            <motion.p variants={fadeUp} className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Trending</motion.p>
            <motion.h2 variants={fadeUp} className="mt-2 font-oswald text-3xl font-black leading-tight tracking-tight text-black sm:text-4xl">
              Best Selling Tyres
            </motion.h2>
            <motion.p variants={fadeUp} className="mt-2 text-base leading-relaxed text-black/65 sm:text-lg">
              Our most popular selections across every road condition.
            </motion.p>
          </motion.div>
          <div className="mt-4 hidden shrink-0 items-center gap-3 lg:flex">
            <Button
              size="icon"
              variant="outline"
              aria-label="Previous tyres"
              onClick={tyresScrollPrev}
              className="h-11 w-11 rounded-full border-primary/30 bg-white text-primary shadow-none hover:bg-primary/5"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              aria-label="Next tyres"
              onClick={tyresScrollNext}
              className="h-11 w-11 rounded-full border-0 bg-primary text-white hover:bg-[#c89907]"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="mt-12 overflow-hidden" ref={tyresEmblaRef}>
          <div className="flex">
            {tyrePages.map((page, pageIndex) => (
              <div key={pageIndex} className="min-w-0 flex-[0_0_100%]">
                <motion.div
                  className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4"
                  initial="hidden"
                  whileInView="visible"
                  viewport={viewport}
                  variants={stagger}
                >
                  {page.map((item) => (
                    <motion.div key={item.id} variants={fadeUp} whileHover={{ y: -5, transition: { duration: 0.18 } }}>
                      <TyreCard item={item} />
                    </motion.div>
                  ))}
                </motion.div>
              </div>
            ))}
          </div>
        </div>

        {scrollSnaps.length > 1 && (
          <div className="mt-10 flex items-center justify-center gap-2">
            {scrollSnaps.map((_, index) => (
              <button
                key={index}
                type="button"
                aria-label={`Go to page ${index + 1}`}
                onClick={() => tyresEmblaApi?.scrollTo(index)}
                className={`h-1 rounded-full transition-all duration-300 ${selectedIndex === index ? "w-8 bg-primary" : "w-4 bg-black/25"}`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
