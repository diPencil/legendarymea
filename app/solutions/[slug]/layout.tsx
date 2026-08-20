export function generateStaticParams() {
  return [
    { slug: 'hotels-accommodation' },
    { slug: 'flights' },
    { slug: 'transfers' },
    { slug: 'car-rental' },
    { slug: 'tours-experiences' },
    { slug: 'groups-special-requests' },
    { slug: 'corporate-travel' },
    { slug: 'hospitality-solutions' },
  ]
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
