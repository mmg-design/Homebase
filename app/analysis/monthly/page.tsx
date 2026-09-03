import { redirect } from 'next/navigation'

export default async function MonthlyAnalysisPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const { month } = await searchParams
  const year = month?.slice(0, 4) || new Date().getFullYear().toString()
  redirect(`/analysis/annual?year=${year}`)
}
