import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { HeroCardDetailPage } from "@/components/hero-card-detail";
import { getHeroCardDetail, heroCardSlugs } from "@/components/hero-card-detail-data";
import { StructuredData, breadcrumbSchema } from "@/components/structured-data";
import { highlightTitles, pageMetadata, SITE_URL } from "@/lib/seo";

export const dynamicParams = false;
export function generateStaticParams() { return heroCardSlugs.map((slug) => ({ slug })); }

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const page = getHeroCardDetail(slug);
  if (!page) return {};
  return pageMetadata(`/highlights/${slug}`, {
    title: `${highlightTitles[slug] ?? page.en.eyebrow} | Legendary Management MEA`,
    description: page.en.subtitle,
    arTitle: `${page.ar.eyebrow} | ليجندري مانجمنت الشرق الأوسط وأفريقيا`,
    arDescription: page.ar.subtitle,
  }, { image: page.image });
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = getHeroCardDetail(slug);
  if (!page) notFound();
  return <><StructuredData data={breadcrumbSchema([{ name: "Home", path: "/" }, { name: "Highlights", path: "/#highlights" }, { name: highlightTitles[slug] ?? page.en.eyebrow, path: `/highlights/${slug}` }], SITE_URL.toString())}/><HeroCardDetailPage slug={slug} /></>;
}
