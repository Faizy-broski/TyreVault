import JobDetailClient from '@/components/fitter/JobDetailClient'

export const metadata = { title: 'Job Details — Fitment Portal' }

export default async function JobDetailPage({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params
  return <JobDetailClient jobId={jobId} />
}
