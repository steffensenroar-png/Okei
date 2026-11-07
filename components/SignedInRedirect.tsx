'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase-browser'

/** Innloggede brukere skal rett til skanning, ikke landingssiden. */
export default function SignedInRedirect() {
  const router = useRouter()
  useEffect(() => {
    if (new URLSearchParams(window.location.search).has('om')) return
    supabase()
      .auth.getSession()
      .then(({ data }) => {
        if (data.session) router.replace('/skann')
      })
  }, [router])
  return null
}
