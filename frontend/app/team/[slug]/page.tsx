import type { Metadata } from 'next'
import { pageMetadata, staticSeo } from '@/lib/seo'
import TeamProfile from './team-profile'

export const dynamic = 'force-dynamic'

type PageProps = {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const member = await fetchTeamMemberForMetadata(slug)

  if (!member) {
    return pageMetadata('/team', staticSeo.team)
  }

  return pageMetadata(`/team/${slug}`, {
    title: `${member.display_name} | Legendary Management MEA Team`,
    description: [member.job_title, member.department, 'Legendary Management MEA'].filter(Boolean).join(' - '),
    arTitle: `${member.display_name} | فريق ليجندري مانجمنت`,
    arDescription: [member.job_title, member.department, 'ليجندري مانجمنت الشرق الأوسط وأفريقيا'].filter(Boolean).join(' - '),
  }, { image: member.photo_url || undefined })
}

export default async function TeamMemberPage({ params }: PageProps) {
  const { slug } = await params

  return <TeamProfile slug={slug} />
}

async function fetchTeamMemberForMetadata(slug: string) {
  const baseUrl = (
    process.env.DASHBOARD_API_BASE_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    'http://127.0.0.1:8001'
  ).replace(/\/+$/, '')

  if (!baseUrl || baseUrl.startsWith('/')) {
    return null
  }

  try {
    const response = await fetch(`${baseUrl}/api/v1/public/team/${encodeURIComponent(slug)}`, {
      headers: { accept: 'application/json' },
      cache: 'no-store',
    })

    if (!response.ok) {
      return null
    }

    const payload = await response.json() as { data?: { display_name?: string; job_title?: string | null; department?: string | null; photo_url?: string | null } }
    return payload.data?.display_name ? payload.data : null
  } catch {
    return null
  }
}
