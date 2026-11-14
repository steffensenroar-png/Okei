'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase-browser'
import { apiPost } from '@/lib/client'
import { useT } from '@/components/I18n'

/** Sletter hele kontoen etter at brukeren har skrevet et bekreftelsesord. */
export default function DeleteAccount() {
  const { t } = useT()
  const [open, setOpen] = useState(false)
  const [typed, setTyped] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const word = t('acct.word')

  async function remove() {
    setBusy(true)
    setError('')
    try {
      await apiPost('/api/account/delete', {})
      await supabase().auth.signOut()
      window.location.href = '/'
    } catch (e) {
      setError(e instanceof Error ? e.message : t('err.generic'))
      setBusy(false)
    }
  }

  return (
    <>
      <button className="linkbtn" style={{ color: 'var(--red)' }} onClick={() => setOpen(true)}>{t('acct.delete')}</button>
      {open && (
        <div className="modal-back" role="dialog" aria-modal="true" aria-labelledby="del-title" onClick={(e) => e.target === e.currentTarget && !busy && setOpen(false)}>
          <div className="modal">
            <h1 id="del-title">{t('acct.title')}</h1>
            <p>{t('acct.text')}</p>
            <p className="small muted">{t('acct.sub')}</p>
            <p className="small muted">{t('acct.keep')}</p>
            <label className="field">
              {t('acct.type', { word })}
              <input className="input" value={typed} onChange={(e) => setTyped(e.target.value)} autoCapitalize="characters" autoComplete="off" />
            </label>
            {error && <div className="alert error" role="alert">{error}</div>}
            <button className="btn btn-primary" style={{ background: 'var(--red)', borderColor: 'var(--red)' }} disabled={busy || typed.trim().toUpperCase() !== word.toUpperCase()} onClick={remove}>
              {busy ? t('saving') : t('acct.confirm')}
            </button>
            <button className="btn" disabled={busy} onClick={() => setOpen(false)}>{t('cancel')}</button>
          </div>
        </div>
      )}
    </>
  )
}
