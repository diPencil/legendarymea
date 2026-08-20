export function generateStaticParams() {
  return [
    { slug: 'travel-agencies' },
    { slug: 'tour-operators' },
    { slug: 'corporate-travel' },
    { slug: 'hospitality-partners' },
  ]
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
