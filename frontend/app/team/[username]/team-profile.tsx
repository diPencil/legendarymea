'use client'

import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { ArrowLeft, ArrowRight, BriefcaseBusiness, MapPin, RefreshCw, ShieldCheck } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { PageShell } from '@/components/site'
import { useLocale } from '@/components/i18n'
import { fetchPublicTeamMember, type PublicTeamMember } from '@/lib/public-team'
import styles from '../team.module.css'

const copy = {
  en: {
    back: 'Back to team',
    kicker: 'TEAM PROFILE',
    role: 'Role',
    department: 'Focus',
    profile: 'Public profile',
    fallbackRole: 'Legendary team member',
    fallbackDepartment: 'Legendary Management MEA',
    loading: 'Loading profile',
    unavailable: 'This public team profile could not be loaded.',
    retry: 'Retry',
    intro: 'Part of the team supporting dependable travel, hospitality and partnership work across the region.',
  },
  ar: {
    back: 'العودة للفريق',
    kicker: 'ملف عضو الفريق',
    role: 'الدور',
    department: 'التخصص',
    profile: 'ملف عام',
    fallbackRole: 'عضو في فريق ليجندري',
    fallbackDepartment: 'ليجندري مانجمنت الشرق الأوسط وأفريقيا',
    loading: 'جاري تحميل الملف',
    unavailable: 'تعذر تحميل ملف عضو الفريق.',
    retry: 'إعادة المحاولة',
    intro: 'جزء من الفريق الذي يدعم أعمال السفر والضيافة والشراكات في المنطقة.',
  },
} as const

export default function TeamProfile({ username }: { username: string }) {
  const { locale } = useLocale()
  const c = copy[locale]
  const isAr = locale === 'ar'
  const [member, setMember] = useState<PublicTeamMember | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadProfile = useCallback(() => {
    const controller = new AbortController()
    setLoading(true)
    setError('')

    fetchPublicTeamMember(username, controller.signal)
      .then(result => {
        if (!result) {
          notFound()
        }
        setMember(result)
      })
      .catch(() => setError(c.unavailable))
      .finally(() => setLoading(false))

    return () => controller.abort()
  }, [username, c.unavailable])

  useEffect(loadProfile, [loadProfile])

  return (
    <PageShell className={styles.shell}>
      <section className={`${styles.profile} section-shell`} dir={isAr ? 'rtl' : 'ltr'}>
        <Link href="/team" className={styles.back}>{isAr ? <ArrowRight size={18} /> : <ArrowLeft size={18} />}{c.back}</Link>
        {loading ? (
          <div className={styles.state}><RefreshCw size={24} aria-hidden="true" />{c.loading}</div>
        ) : error ? (
          <div className={styles.state}>
            <p>{error}</p>
            <button type="button" onClick={() => { loadProfile() }}><RefreshCw size={18} aria-hidden="true" />{c.retry}</button>
          </div>
        ) : member ? (
          <div className={styles.profileLayout}>
            <div className={styles.profileMedia}><ProfileImage member={member} /></div>
            <div className={styles.profileCopy}>
              <div className="section-kicker">{c.kicker}</div>
              <h1>{member.display_name}</h1>
              <p>{c.intro}</p>
              <dl>
                <div><dt><BriefcaseBusiness size={17} />{c.role}</dt><dd>{member.job_title || c.fallbackRole}</dd></div>
                <div><dt><MapPin size={17} />{c.department}</dt><dd>{member.department || c.fallbackDepartment}</dd></div>
                <div><dt><ShieldCheck size={17} />{c.profile}</dt><dd>{member.slug}</dd></div>
              </dl>
            </div>
          </div>
        ) : null}
      </section>
    </PageShell>
  )
}

function ProfileImage({ member }: { member: PublicTeamMember }) {
  const [failed, setFailed] = useState(false)

  if (!member.photo_url || failed) {
    return <div className={styles.profileInitials}>{member.initials}</div>
  }

  return (
    <span className={styles.profilePhotoWrap}>
      <Image className={styles.profilePhoto} src={member.photo_url} alt={member.display_name} fill sizes="(max-width: 920px) 100vw, 480px" onError={() => setFailed(true)} />
    </span>
  )
}
