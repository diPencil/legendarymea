"use client";
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function CareersRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/platform');
  }, [router]);

  return (
    <html>
      <head>
        <meta httpEquiv="refresh" content="0; url=/platform" />
      </head>
      <body>
        <p>Redirecting to <a href="/platform">/platform</a>...</p>
      </body>
    </html>
  );
}
