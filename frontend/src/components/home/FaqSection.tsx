"use client";
import Image from "next/image";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { motion } from "framer-motion";
import { fadeUp, stagger, viewport } from "./motion-variants";
import { faqs } from "./data";

export default function FaqSection() {
  return (
    <section className="relative overflow-hidden py-20 lg:py-28">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_right,rgba(223,173,8,0.12),transparent_50%)]" />
      <div className="absolute right-0 top-0 h-full w-[260px] opacity-[0.05]">
        <Image src="/tyre.svg" alt="pattern" fill className="object-cover" sizes="260px" />
      </div>
      <div className="relative z-10 mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-10">
        <motion.div className="mb-14" initial="hidden" whileInView="visible" viewport={viewport} variants={stagger}>
          <motion.h2 variants={fadeUp} className="font-oswald text-3xl font-black leading-tight tracking-tight text-black sm:text-4xl">
            Frequently Asked Questions
          </motion.h2>
          <motion.p variants={fadeUp} className="mt-3 text-base leading-relaxed text-black/65 sm:text-lg">
            Buying tires online has never been easier.
          </motion.p>
        </motion.div>
        <div className="grid items-start gap-10 lg:grid-cols-[360px_1fr] lg:gap-12">
          <motion.div
            className="relative hidden h-[500px] overflow-hidden rounded-[34px] lg:block"
            initial={{ opacity: 0, scale: 0.96 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={viewport}
            transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            <Image
              src="https://images.unsplash.com/photo-1503376780353-7e6692767b70?q=80&w=1200&auto=format&fit=crop"
              alt="Car" fill
              sizes="(max-width: 1024px) 0px, 360px"
              className="object-cover transition-transform duration-700 hover:scale-[1.03]"
            />
          </motion.div>
          <motion.div initial="hidden" whileInView="visible" viewport={viewport} variants={stagger}>
            <Accordion type="single" collapsible defaultValue="item-0" className="space-y-5">
              {faqs.map((faq, index) => (
                <motion.div key={index} variants={fadeUp}>
                  <AccordionItem
                    value={`item-${index}`}
                    className="overflow-hidden border bg-white transition-all data-[state=closed]:rounded-full data-[state=closed]:border-[#ece7dc] data-[state=open]:rounded-[30px] data-[state=open]:border-t-5 data-[state=open]:border-t-primary data-[state=open]:shadow-[0_10px_30px_rgba(0,0,0,0.03)]"
                  >
                    <AccordionTrigger className="px-6 py-6 text-left text-base font-bold text-[#1b1d28] hover:no-underline sm:px-8 sm:py-5 sm:text-lg">
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent className="px-6 pb-6 pt-0 text-sm leading-relaxed text-[#7a7a7a] sm:px-8 sm:pb-8 sm:text-base">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                </motion.div>
              ))}
            </Accordion>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

