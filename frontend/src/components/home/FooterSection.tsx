"use client";
import Image from "next/image";
import Link from "next/link";
import { FaFacebookF, FaInstagram, FaLinkedinIn, FaPinterestP, FaTwitter, FaYoutube } from "react-icons/fa";
import { motion } from "framer-motion";
import { fadeUp, scaleIn, stagger, viewport } from "./motion-variants";
import { topLinks, footerLinks } from "./data";

const socialIcons = [FaFacebookF, FaInstagram, FaLinkedinIn, FaPinterestP, FaYoutube, FaTwitter];

export default function FooterSection() {
  return (
    <footer
      className="relative overflow-hidden text-white"
      style={{
        backgroundColor: '#000',
        backgroundImage: 'url(/footer-bg.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <div className="absolute inset-0 bg-black/50" />

      <div className="relative z-10 mx-auto max-w-[1400px] px-4 py-12 sm:px-6 sm:py-14 lg:px-10">
        <div className="rounded-[28px] border border-white/10 bg-white/[0.02] p-5 backdrop-blur-sm sm:p-8">
          <div className="grid grid-cols-2 gap-6 sm:gap-8 md:grid-cols-3 xl:grid-cols-6">
            {topLinks.map((section) => (
              <div key={section.title}>
                <h3 className="mb-5 text-lg font-bold text-white sm:text-xl">{section.title}</h3>
                <ul className="space-y-2">
                  {section.items.map((item) => (
                    <li key={item}>
                      <Link href="#" className="inline-block text-sm text-white/70 transition-all duration-200 hover:translate-x-1 hover:text-primary sm:text-[15px]">
                        {item}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <motion.div
          className="mt-12 grid gap-10 sm:grid-cols-2 sm:gap-12 lg:mt-16 lg:grid-cols-[1.3fr_1fr_1fr_1fr] lg:gap-16"
          initial="hidden" whileInView="visible" viewport={viewport} variants={stagger}
        >
          <motion.div variants={fadeUp}>
            <div className="flex items-center gap-3">
              <Image src="/logo.svg" width={200} height={300} alt="Tyre Vault" />
            </div>
            <p className="mt-8 max-w-[340px] text-base leading-relaxed text-white/65">
              Premium tyres at unbeatable prices. Trusted by thousands of drivers worldwide.
            </p>
            <motion.div className="mt-8 flex items-center gap-5" initial="hidden" whileInView="visible" viewport={viewport} variants={stagger}>
              {socialIcons.map((Icon, index) => (
                <motion.div key={index} variants={scaleIn}>
                  <Link href="#" className="block text-white transition-colors duration-200 hover:text-primary">
                    <motion.span className="block" whileHover={{ scale: 1.2, y: -2 }} whileTap={{ scale: 0.9 }} transition={{ type: "spring", stiffness: 400, damping: 20 }}>
                      <Icon className="h-6 w-6" />
                    </motion.span>
                  </Link>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>

          {footerLinks.map((section) => (
            <motion.div key={section.title} variants={fadeUp}>
              <h3 className="mb-6 text-xl font-bold text-primary">{section.title}</h3>
              <ul className="space-y-4">
                {section.links.map((link) => (
                  <li key={link}>
                    <Link href="#" className="inline-block text-base text-white/70 transition-all duration-200 hover:translate-x-1 hover:text-white">
                      {link}
                    </Link>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </motion.div>

        <div className="mt-16 border-t border-white/10 pt-8 text-center">
          <p className="text-sm text-white/45">
            © 2026 Made with 🤍 TSN. The trademark tyre vault is registered with the US Patent and Trademark Office. All Rights Reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
