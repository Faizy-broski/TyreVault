import type { Metadata } from 'next'
import { Geist, Geist_Mono, Inter, Oswald } from 'next/font/google'
import './globals.css'
import { cn } from "@/lib/utils"
import NavigationProgress from '@/components/NavigationProgress'

const inter = Inter({subsets:['latin'],variable:'--font-sans'});

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

const oswald = Oswald({
  subsets: ["latin"],
  variable: "--font-oswald",
});

export const metadata: Metadata = {
  title: {
    default: 'Tyre Vault',
    template: '%s | Tyre Vault',
  },
  description: 'Premium tyres and autoparts — shop, compare, and book fitting online.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={cn("font-sans", inter.variable)}>
      <body suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <NavigationProgress />
        {children}
      </body>
    </html>
  )
}
