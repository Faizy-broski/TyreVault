'use client'

import { useState, useEffect } from 'react'
import TopBar from '@/components/home/TopBar'
import Navbar from '@/components/home/Navbar'

export default function StorefrontShell() {
  const [topbarScrolled, setTopbarScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setTopbarScrolled(window.scrollY >= 40)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <>
      <TopBar />
      <Navbar topbarScrolled={topbarScrolled} />
    </>
  )
}

