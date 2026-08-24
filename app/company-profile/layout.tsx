import type { Metadata } from 'next'
import { pageMetadata, staticSeo } from '@/lib/seo'

export const metadata: Metadata = pageMetadata('/company-profile', staticSeo.companyProfile)

export default function CompanyProfileLayout({ children }: { children: React.ReactNode }) {
  return children
}
