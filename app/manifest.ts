import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Okei – allergisjekk',
    short_name: 'Okei',
    start_url: '/skann',
    display: 'standalone',
    background_color: '#F6F5F0',
    theme_color: '#0E6B57',
    lang: 'no',
    icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }]
  }
}
