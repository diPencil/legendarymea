'use client'

import Link from 'next/link'
import Image from 'next/image'
import { ArrowUpRight, BriefcaseBusiness, RefreshCw, UsersRound } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { PageShell } from '@/components/site'
import { useLocale } from '@/components/i18n'
import { fetchPublicTeam, type PublicTeamMember } from '@/lib/public-team'
import styles from './team.module.css'

const copy = {
  en: {
    kicker: 'TEAM',
    title: 'Meet the people behind Legendary.',
    intro: 'A public view of the active team supporting travel operations, partnerships and client relationships across the region.',
    loading: 'Loading team members',
    empty: 'No public team members yet.',
    retry: 'Retry',
    unavailable: 'Team members could not be loaded right now.',
    view: 'View profile',
    fallbackRole: 'Legendary team member',
    fallbackDepartment: 'Legendary Management MEA',
    meta: 'Active public profiles',
  },
  ar: {
    kicker: 'فريق العمل',
    title: 'تعرف على الناس وراء ليجندري.',
    intro: 'عرض عام لأعضاء الفريق النشطين الذين يدعمون التشغيل والشراكات وعلاقات العملاء في المنطقة.',
    loading: 'جاري تحميل الفريق',
    empty: 'لا يوجد أعضاء فريق للعرض حالياً.',
    retry: 'إعادة المحاولة',
    unavailable: 'تعذر تحميل أعضاء الفريق حالياً.',
    view: 'عرض الملف',
    fallbackRole: 'عضو في فريق ليجندري',
    fallbackDepartment: 'ليجندري مانجمنت الشرق الأوسط وأفريقيا',
    meta: 'ملفات عامة نشطة',
  },
} as const

export default function TeamExperience() {
  const { locale } = useLocale()
  const c = copy[locale]
  const isAr = locale === 'ar'
  const [members, setMembers] = useState<PublicTeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadTeam = useCallback(() => {
    const controller = new AbortController()
    setLoading(true)
    setError('')

    fetchPublicTeam(controller.signal)
      .then(setMembers)
      .catch(() => setError(c.unavailable))
      .finally(() => setLoading(false))

    return () => controller.abort()
  }, [c.unavailable])

  useEffect(loadTeam, [loadTeam])

  return (
    <PageShell className={styles.shell}>
      <section className={`${styles.hero} section-shell`} dir={isAr ? 'rtl' : 'ltr'}>
        <div>
          <div className="section-kicker">{c.kicker}</div>
          <h1>{c.title}</h1>
          <p>{c.intro}</p>
        </div>
        <div className={styles.stat} aria-label={c.meta}>
          <UsersRound size={28} aria-hidden="true" />
          <strong>{members.length}</strong>
          <span>{c.meta}</span>
        </div>
      </section>

      <section className={`${styles.gridSection} section-shell`} dir={isAr ? 'rtl' : 'ltr'}>
        {loading ? (
          <div className={styles.state}><RefreshCw size={24} aria-hidden="true" />{c.loading}</div>
        ) : error ? (
          <div className={styles.state}>
            <p>{error}</p>
            <button type="button" onClick={() => { loadTeam() }}><RefreshCw size={18} aria-hidden="true" />{c.retry}</button>
          </div>
        ) : members.length === 0 ? (
          <div className={styles.state}>{c.empty}</div>
        ) : (
          <div className={styles.grid}>
            {members.map(member => (
              <Link className={styles.card} href={member.profile_url} key={member.slug}>
                <ProfileImage member={member} />
                <div className={styles.cardBody}>
                  <span><BriefcaseBusiness size={16} aria-hidden="true" />{member.department || c.fallbackDepartment}</span>
                  <h2>{member.display_name}</h2>
                  <p>{member.job_title || c.fallbackRole}</p>
                  <strong>{c.view}<ArrowUpRight size={16} aria-hidden="true" /></strong>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </PageShell>
  )
}

function ProfileImage({ member }: { member: PublicTeamMember }) {
  const [failed, setFailed] = useState(false)

  if (!member.photo_url || failed) {
    return <div className={styles.initials}>{member.initials}</div>
  }

  return (
    <span className={styles.photoWrap}>
      <Image className={styles.photo} src={member.photo_url} alt={member.display_name} fill sizes="(max-width: 640px) 100vw, (max-width: 920px) 50vw, 33vw" onError={() => setFailed(true)} />
    </span>
  )
}
