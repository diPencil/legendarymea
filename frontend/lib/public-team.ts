export type PublicTeamMember = {
  slug: string
  display_name: string
  initials: string
  job_title: string | null
  department: string | null
  photo_url: string | null
  profile_url: string
}

type TeamEnvelope<T> = {
  data?: T
}

function normalizeTeamUrl(path = '') {
  return `/dashboard-api/api/v1/public/team${path}`
}

function normalizeMember(input: Partial<PublicTeamMember>): PublicTeamMember | null {
  if (!input.slug || !input.display_name || !input.profile_url) {
    return null
  }

  return {
    slug: input.slug,
    display_name: input.display_name,
    initials: input.initials || 'LM',
    job_title: input.job_title ?? null,
    department: input.department ?? null,
    photo_url: input.photo_url ?? null,
    profile_url: input.profile_url,
  }
}

export async function fetchPublicTeam(signal?: AbortSignal): Promise<PublicTeamMember[]> {
  const response = await fetch(normalizeTeamUrl(), {
    headers: { accept: 'application/json' },
    cache: 'no-store',
    signal,
  })

  if (!response.ok) {
    throw new Error('Team members could not be loaded.')
  }

  const payload = await response.json() as TeamEnvelope<Partial<PublicTeamMember>[]>
  return (payload.data ?? []).map(normalizeMember).filter((member): member is PublicTeamMember => Boolean(member))
}

export async function fetchPublicTeamMember(username: string, signal?: AbortSignal): Promise<PublicTeamMember | null> {
  const response = await fetch(normalizeTeamUrl(`/${encodeURIComponent(username)}`), {
    headers: { accept: 'application/json' },
    cache: 'no-store',
    signal,
  })

  if (response.status === 404) {
    return null
  }

  if (!response.ok) {
    throw new Error('Team member could not be loaded.')
  }

  const payload = await response.json() as TeamEnvelope<Partial<PublicTeamMember>>
  return normalizeMember(payload.data ?? {})
}
