import type { Metadata, Viewport } from 'next'
import '@fontsource-variable/plus-jakarta-sans'
import './globals.css'
import ThemeSync from '@/components/ThemeSync'
import CodeCapture from '@/components/CodeCapture'
import { I18nProvider } from '@/components/I18n'

const THEME_BOOT = `(function(){try{var t=localStorage.getItem('okei.theme')||'auto',a=localStorage.getItem('okei.accent')||'green';var d=t==='dark'||(t==='auto'&&window.matchMedia('(prefers-color-scheme: dark)').matches);var h=document.documentElement;h.dataset.theme=d?'dark':'light';h.dataset.accent=a;}catch(e){}})();`

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
    <html lang="no" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} />
      </head>
      <body>
        <ThemeSync />
        <CodeCapture />
        <I18nProvider>
          <div className="shell">{children}</div>
        </I18nProvider>
      </body>
    </html>
  )
}
