import type { Metadata, Viewport } from 'next'
import '@fontsource-variable/plus-jakarta-sans'
import './globals.css'

export const metadata: Metadata = {
  title: 'Okei – allergisjekk',
  description: 'Ta bilde av maten og få rødt, gult eller grønt flagg mot dine og barnas allergier.',
  applicationName: 'Okei',
  appleWebApp: { capable: true, title: 'Okei', statusBarStyle: 'default' },
  robots: { index: false, follow: false }
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0E6B57'
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="no">
      <body>
        <div className="shell">{children}</div>
      </body>
    </html>
  )
}
