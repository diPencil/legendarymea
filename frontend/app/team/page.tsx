import type { Metadata } from 'next'
import { pageMetadata, staticSeo } from '@/lib/seo'
import TeamExperience from './team-experience'

export const metadata: Metadata = pageMetadata('/team', staticSeo.team)

export default function TeamPage() {
  return <TeamExperience />
}
