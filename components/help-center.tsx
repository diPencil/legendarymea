'use client'

import Link from 'next/link'
import { ArrowLeft, ArrowRight, BookOpen, Search, X } from 'lucide-react'
import { useMemo, useState } from 'react'

import { useLocale } from '@/components/i18n'
import { getHelpArticle, getHelpCategory, helpArticles, helpCategories } from '@/components/help-center-data'

export function HelpCenterHome() {
  const { locale } = useLocale()
  const isAr = locale === 'ar'
  const Arrow = isAr ? ArrowLeft : ArrowRight
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('all')
  const normalized = query.trim().toLocaleLowerCase(locale)

  const matches = useMemo(() => helpArticles.filter(article => {
    const categoryTitle = getHelpCategory(article.category)?.title[locale] ?? ''
    const haystack = `${article.title[locale]} ${article.summary[locale]} ${article.keywords[locale]} ${categoryTitle}`.toLocaleLowerCase(locale)
    return (category === 'all' || article.category === category) && (!normalized || haystack.includes(normalized))
  }), [category, locale, normalized])

  const showResults = Boolean(normalized || category !== 'all')
  const popular = helpArticles.filter(article => article.popular).slice(0, 6)

  return <div className="help-center" dir={isAr ? 'rtl' : 'ltr'}>
    <section className="help-hero">
      <div className="help-hero-inner section-shell">
        <div className="section-kicker light">{isAr ? 'مركز المساعدة' : 'HELP CENTER'}</div>
        <h1>{isAr ? 'وش تحتاج تعرف؟' : 'What can we help you with?'}</h1>
        <p>{isAr ? 'ابحث عن طريقة إرسال الطلب، تفاصيل الخدمات، الشراكات، أو استخدام المنصة.' : 'Find practical guidance on travel requests, services, partnerships and the Platform.'}</p>
        <div className="help-search-shell">
          <Search size={21} aria-hidden="true"/>
          <input value={query} onChange={event => setQuery(event.target.value)} placeholder={isAr ? 'ابحث في مركز المساعدة' : 'Search the Help Center'} aria-label={isAr ? 'ابحث في مركز المساعدة' : 'Search the Help Center'}/>
          {query && <button type="button" onClick={() => setQuery('')} aria-label={isAr ? 'مسح البحث' : 'Clear search'}><X size={17}/></button>}
        </div>
        <div className="help-category-filters" aria-label={isAr ? 'تصفية حسب الموضوع' : 'Filter by topic'}>
          <button type="button" className={category === 'all' ? 'active' : ''} onClick={() => setCategory('all')}>{isAr ? 'كل المواضيع' : 'All topics'}</button>
          {helpCategories.map(item => <button type="button" className={category === item.id ? 'active' : ''} onClick={() => setCategory(item.id)} key={item.id}>{item.title[locale]}</button>)}
        </div>
      </div>
    </section>

    {showResults && <section className="help-search-results section-shell" aria-live="polite">
      <div className="help-section-heading"><span>{isAr ? 'نتائج البحث' : 'SEARCH RESULTS'}</span><strong>{matches.length}</strong></div>
      {matches.length ? <div className="help-result-list">{matches.map(article => <HelpResult articleSlug={article.slug} locale={locale} key={article.slug}/>)}</div> : <div className="help-empty"><strong>{isAr ? 'ما لقينا نتيجة مطابقة.' : 'No matching guide found.'}</strong><p>{isAr ? 'جرّب تبحث باسم الخدمة، نوع الطلب، أو موضوع في المنصة.' : 'Try a service name, request type or Platform topic.'}</p></div>}
    </section>}

    {!showResults && <>
      <section className="help-popular section-shell">
        <div className="help-section-heading"><span>{isAr ? 'الأكثر استخدامًا' : 'POPULAR HELP'}</span><strong>01</strong></div>
        <div className="help-result-list">{popular.map(article => <HelpResult articleSlug={article.slug} locale={locale} key={article.slug}/>)}</div>
      </section>
      <section className="help-directory section-shell">
        <div className="help-section-heading"><span>{isAr ? 'تصفح حسب الموضوع' : 'BROWSE BY TOPIC'}</span><strong>02</strong></div>
        <div className="help-directory-list">{helpCategories.map(item => {
          const count = helpArticles.filter(article => article.category === item.id).length
          const first = helpArticles.find(article => article.category === item.id)
          return <article key={item.id}><span>{item.number}</span><div><h2>{item.title[locale]}</h2><p>{isAr ? `${count} أدلة عملية` : `${count} practical ${count === 1 ? 'guide' : 'guides'}`}</p></div>{first && <Link href={`/help-center/${first.slug}`} aria-label={`${item.title[locale]} — ${isAr ? 'فتح أول دليل' : 'Open first guide'}`}><Arrow size={19}/></Link>}</article>
        })}</div>
      </section>
    </>}

    <HelpSupport locale={locale}/>
  </div>
}

function HelpResult({ articleSlug, locale }: { articleSlug: string; locale: 'en' | 'ar' }) {
  const article = getHelpArticle(articleSlug)!
  const category = getHelpCategory(article.category)!
  const Arrow = locale === 'ar' ? ArrowLeft : ArrowRight
  return <Link className="help-result" href={`/help-center/${article.slug}`}><BookOpen size={18}/><div><span>{category.title[locale]}</span><h3>{article.title[locale]}</h3><p>{article.summary[locale]}</p></div><Arrow className="help-result-arrow" size={18}/></Link>
}

export function HelpArticleView({ slug }: { slug: string }) {
  const { locale } = useLocale()
  const isAr = locale === 'ar'
  const article = getHelpArticle(slug)!
  const category = getHelpCategory(article.category)!
  const categoryArticles = helpArticles.filter(item => item.category === article.category)
  const related = article.related.map(getHelpArticle).filter(Boolean)

  return <div className="help-article-page" dir={isAr ? 'rtl' : 'ltr'}>
    <div className="help-article-shell section-shell">
      <nav className="help-topic-nav" aria-label={isAr ? 'أدلة الموضوع' : 'Topic guides'}>
        <Link href="/help-center">{isAr ? 'مركز المساعدة' : 'Help Center'}</Link>
        <strong>{category.title[locale]}</strong>
        {categoryArticles.map(item => <Link className={item.slug === slug ? 'active' : ''} href={`/help-center/${item.slug}`} key={item.slug}>{item.title[locale]}</Link>)}
      </nav>

      <article className="help-article">
        <div className="help-breadcrumb"><Link href="/help-center">{isAr ? 'مركز المساعدة' : 'Help Center'}</Link><span>/</span><span>{category.title[locale]}</span></div>
        <span className="help-article-category">{category.number} / {category.title[locale]}</span>
        <h1>{article.title[locale]}</h1>
        <p className="help-article-intro">{article.summary[locale]}</p>
        {article.sections.map(section => <section id={section.id} key={section.id}><h2>{section.title[locale]}</h2><p>{section.body[locale]}</p>{section.points && <ul>{section.points[locale].map(point => <li key={point}>{point}</li>)}</ul>}</section>)}
        {related.length > 0 && <div className="help-related"><h2>{isAr ? 'أدلة مرتبطة' : 'Related guides'}</h2>{related.map(item => <HelpResult articleSlug={item!.slug} locale={locale} key={item!.slug}/>)}</div>}
      </article>

      {article.sections.length > 1 && <aside className="help-on-page"><span>{isAr ? 'في هالصفحة' : 'ON THIS PAGE'}</span>{article.sections.map(section => <a href={`#${section.id}`} key={section.id}>{section.title[locale]}</a>)}</aside>}
    </div>
    <HelpSupport locale={locale}/>
  </div>
}

function HelpSupport({ locale }: { locale: 'en' | 'ar' }) {
  return <section className="help-support"><div className="section-shell"><div><span>{locale === 'ar' ? 'تحتاج مساعدة أكثر؟' : 'STILL NEED HELP?'}</span><h2>{locale === 'ar' ? 'أرسل لنا التفاصيل ونكمّل معك.' : "Send us the details and we'll take it from there."}</h2></div><Link className="button button-gold" href="/contact">{locale === 'ar' ? 'تواصل معنا' : 'Contact us'}</Link></div></section>
}
