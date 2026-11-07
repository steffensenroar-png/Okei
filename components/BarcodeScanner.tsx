'use client'

import { useEffect, useRef, useState } from 'react'
import { validGtin } from '@/lib/client'

interface Props {
  onCode: (code: string) => void
  paused?: boolean
}

export default function BarcodeScanner({ onCode, paused }: Props) {
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
      setManualError('Sjekk tallene. Strekkoden har 8 eller 13 siffer.')
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
        {status === 'starting' && <div className="msg">Starter kamera…</div>}
        {status === 'denied' && (
          <div className="msg">Fikk ikke tilgang til kameraet. Gi nettleseren tilgang, eller skriv inn tallene under strekkoden.</div>
        )}
        {status === 'unsupported' && <div className="msg">Kameraet støttes ikke her. Skriv inn tallene under strekkoden.</div>}
      </div>
      {status === 'running' && <p className="small muted" style={{ textAlign: 'center' }}>Hold strekkoden i rammen. Vi skanner automatisk.</p>}
      <form onSubmit={submitManual} className="row">
        <input
          className="input"
          inputMode="numeric"
          autoComplete="off"
          placeholder="Eller skriv inn strekkoden"
          aria-label="Strekkode"
          value={manual}
          onChange={(e) => setManual(e.target.value)}
        />
        <button className="btn btn-small btn-primary" type="submit" style={{ minHeight: 48 }}>Sjekk</button>
      </form>
      {manualError && <div className="alert error" role="alert">{manualError}</div>}
    </div>
  )
}
