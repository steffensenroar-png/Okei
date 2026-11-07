'use client'

import { useT } from '@/components/I18n'
import { useEffect, useRef, useState } from 'react'
import { validGtin } from '@/lib/client'

interface Props {
  onCode: (code: string) => void
  paused?: boolean
}

export default function BarcodeScanner({ onCode, paused }: Props) {
  const { t } = useT()
  const videoRef = useRef<HTMLVideoElement>(null)
  const [status, setStatus] = useState<'starting' | 'running' | 'denied' | 'unsupported'>('starting')
  const [manual, setManual] = useState('')
  const [manualError, setManualError] = useState('')
  const onCodeRef = useRef(onCode)
  onCodeRef.current = onCode

  useEffect(() => {
    if (paused) return
    let controls: { stop: () => void } | null = null
    let cancelled = false

    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setStatus('unsupported')
        return
      }
      try {
        const [{ BrowserMultiFormatReader }, { BarcodeFormat, DecodeHintType }] = await Promise.all([
          import('@zxing/browser'),
          import('@zxing/library')
        ])
        const hints = new Map()
        hints.set(DecodeHintType.POSSIBLE_FORMATS, [
          BarcodeFormat.EAN_13,
          BarcodeFormat.EAN_8,
          BarcodeFormat.UPC_A,
          BarcodeFormat.UPC_E
        ])
        const reader = new BrowserMultiFormatReader(hints, { delayBetweenScanAttempts: 150 })
        if (cancelled || !videoRef.current) return
        controls = await reader.decodeFromConstraints(
          { video: { facingMode: { ideal: 'environment' } }, audio: false },
          videoRef.current,
          (result) => {
            if (!result) return
            const text = result.getText()
            if (validGtin(text)) {
              controls?.stop()
              onCodeRef.current(text)
            }
          }
        )
        if (cancelled) controls.stop()
        else setStatus('running')
      } catch {
        if (!cancelled) setStatus('denied')
      }
    }
    start()
    return () => {
      cancelled = true
      controls?.stop()
    }
  }, [paused])

  function submitManual(e: React.FormEvent) {
    e.preventDefault()
    const code = manual.replace(/\D/g, '')
    if (!validGtin(code)) {
      setManualError(t('bc.badCode'))
      return
    }
    setManualError('')
    onCode(code)
  }

  return (
    <div className="stack" style={{ gap: 14 }}>
      <div className="camera">
        <video ref={videoRef} muted playsInline autoPlay />
        <div className="frame" />
        {status === 'starting' && <div className="msg">{t('bc.starting')}</div>}
        {status === 'denied' && (
          <div className="msg">{t('bc.denied')}</div>
        )}
        {status === 'unsupported' && <div className="msg">{t('bc.unsupported')}</div>}
      </div>
      {status === 'running' && <p className="small muted" style={{ textAlign: 'center' }}>{t('bc.hold')}</p>}
      <form onSubmit={submitManual} className="row">
        <input
          className="input"
          inputMode="numeric"
          autoComplete="off"
          placeholder={t('bc.manual')}
          aria-label={t('bc.label')}
          value={manual}
          onChange={(e) => setManual(e.target.value)}
        />
        <button className="btn btn-small btn-primary" type="submit" style={{ minHeight: 48 }}>{t('bc.check')}</button>
      </form>
      {manualError && <div className="alert error" role="alert">{manualError}</div>}
    </div>
  )
}
