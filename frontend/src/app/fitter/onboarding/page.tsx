import type { Metadata } from 'next'
import OnboardingForm from '@/components/fitter/OnboardingForm'

export const metadata: Metadata = {
  title: 'Fitment Centre Onboarding — Tyre Vault',
  description: 'Apply to become a Tyre Vault Fitment Centre partner.',
}

export default function FitterOnboardingPage() {
  return <OnboardingForm />
}
