"use client";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import { fadeUp, scaleIn, stagger, viewport } from "./motion-variants";

const vehicleTypes = [
  { title: "Sedan", image: "/Sedan.svg" },
  { title: "SUV", image: "/SUV.svg" },
  { title: "4×4", image: "/4x4.svg" },
  { title: "Truck", image: "/Truck.svg" },
  { title: "Sports", image: "/Sports.svg" },
];

export default function VehicleTypesSection() {
  return (
    <section className="relative overflow-hidden py-16 md:py-24">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_right,rgba(223,173,8,0.12),transparent_50%)]" />
      <div className="relative z-10 mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-10">
        <motion.div className="max-w-2xl" initial="hidden" whileInView="visible" viewport={viewport} variants={stagger}>
          <motion.p variants={fadeUp} className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Browse</motion.p>
          <motion.h2 variants={fadeUp} className="mt-2 font-oswald text-3xl font-black leading-tight tracking-tight text-black sm:text-4xl">
            Shop By Vehicle Type
          </motion.h2>
          <motion.p variants={fadeUp} className="mt-3 text-base leading-relaxed text-black/65 sm:text-lg">
            Explore premium tyre options tailored for every vehicle, road, and driving style.
          </motion.p>
        </motion.div>
        <motion.div
          className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:mt-12 lg:grid-cols-5"
          initial="hidden" whileInView="visible" viewport={viewport} variants={stagger}
        >
          {vehicleTypes.map((item) => (
            <motion.div key={item.title} variants={scaleIn} whileHover={{ y: -5, transition: { duration: 0.18 } }}>
              <Card className="group overflow-hidden rounded-2xl border border-black/5 bg-white shadow-none transition-all duration-300 hover:border-primary/30 hover:shadow-md">
                <CardContent className="p-0">
                  <div className="relative flex h-28 items-center justify-center overflow-hidden sm:h-36">
                    <Image src={item.image} alt={item.title} fill className="object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
                  </div>
                  <div className="py-3 text-center">
                    <h3 className="text-sm font-bold tracking-tight text-black">{item.title}</h3>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
