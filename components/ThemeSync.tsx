'use client'

import { useEffect } from 'react'
import { applyTheme, getTheme } from '@/lib/theme'

/** Følger telefonens lys/mørk-innstilling når temaet står på «Som telefonen». */
export default function ThemeSync() {
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => {
      if (getTheme() === 'auto') applyTheme()
    }
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return null
}
