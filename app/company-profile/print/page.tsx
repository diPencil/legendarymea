import type { Metadata } from 'next'
import { CompanyProfilePrint } from '@/components/company-profile/company-profile-print'
import { pageMetadata, staticSeo } from '@/lib/seo'

export const metadata: Metadata = {
  ...pageMetadata('/company-profile', {
    ...staticSeo.companyProfile,
    title: 'Print Company Profile | Legendary Management MEA',
    arTitle: 'طباعة ملف الشركة | ليجندري مانجمنت الشرق الأوسط وأفريقيا',
  }, { index: false }),
}

export default function CompanyProfilePrintPage() {
  return <CompanyProfilePrint />
}
