import {
  LayoutDashboard, CalendarDays, CircleDollarSign,
  Tag, Wrench, UserRound, LifeBuoy, ClipboardList,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface NavItem {
  label: string
  href:  string
  icon:  LucideIcon
}

export const FITTER_NAV: NavItem[] = [
  { label: 'Dashboard',          href: '/fitter/dashboard', icon: LayoutDashboard  },
  { label: 'Jobs',               href: '/fitter/jobs',      icon: ClipboardList    },
  { label: 'Schedule',           href: '/fitter/schedule',  icon: CalendarDays     },
  { label: 'Earnings',           href: '/fitter/earnings',  icon: CircleDollarSign },
  { label: 'Pricing',            href: '/fitter/pricing',   icon: Tag              },
  { label: 'Services',           href: '/fitter/services',  icon: Wrench           },
  { label: 'Profile & Settings', href: '/fitter/profile',   icon: UserRound        },
  { label: 'Support',            href: '/fitter/support',   icon: LifeBuoy         },
]
