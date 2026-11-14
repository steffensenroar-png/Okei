'use client'

import Link from 'next/link'
import { Animal, FoodSticker, Mascot, ModeArt } from '@/components/Art'
import { FlagIcon, Logo } from '@/components/Icons'
import AllergenIcon from '@/components/AllergenIcon'
import SignedInRedirect from '@/components/SignedInRedirect'
import { LangPicker, useT } from '@/components/I18n'

export default function Landing() {
  const { t } = useT()
  const FLAGS = [
    { flag: 'red' as const, mood: 'stop' as const },
    { flag: 'yellow' as const, mood: 'unsure' as const },
    { flag: 'green' as const, mood: 'happy' as const }
  ]
  const PRIVACY = ['doctor', 'images', 'eu', 'ads', 'control', 'kids']
  return (
    <div className="landing">
      <SignedInRedirect />

      <header className="ld-top ld-wrap">
        <Logo />
        <span className="row" style={{ gap: 8 }}>
          <LangPicker />
          <Link className="btn btn-small" href="/logg-inn">{t('ld.login')}</Link>
        </span>
      </header>

      <section className="ld-hero ld-wrap">
        <div className="ld-hero-text">
          <span className="ld-eyebrow">{t('ld2.eyebrow')}</span>
          <h1>
            {t('ld2.h1')}
            <span className="ld-h1b">{t('ld2.h1b')}</span>
          </h1>
          <p className="ld-lead">{t('ld2.lead')}</p>
          <div className="ld-cta">
            <Link className="btn btn-primary" href="/logg-inn">{t('ld2.start')}</Link>
            <a className="btn" href="#barnet">{t('ld.how')}</a>
          </div>
          <p className="tiny">{t('ld.free')}</p>
        </div>
        <KidPhone />
      </section>

      <section className="ld-why">
        <div className="ld-wrap ld-narrow">
          <h2>{t('ld2.whyH')}</h2>
          <p>{t('ld2.why1')}</p>
          <p>{t('ld2.why2')}</p>
        </div>
      </section>

      <section id="barnet" className="ld-wrap ld-section">
        <div className="stack" style={{ gap: 8 }}>
          <h2>{t('ld2.kidH')}</h2>
          <p className="muted ld-narrow-p">{t('ld2.kidT')}</p>
        </div>
        <div className="ld-kid-grid">
          <div className="ld-kid-card sky">
            <span className="ld-kid-icon"><ModeArt mode="label" size={46} /></span>
            <h3>{t('ld2.k1')}</h3>
            <p>{t('ld2.k1t')}</p>
          </div>
          <div className="ld-kid-card green">
            <span className="ld-kid-icon"><Mascot mood="happy" size={56} /></span>
            <h3>{t('ld2.k2')}</h3>
            <p>{t('ld2.k2t')}</p>
          </div>
          <div className="ld-kid-card peach">
            <span className="ld-kid-icon ld-kid-emoji" aria-hidden="true">📞</span>
            <h3>{t('ld2.k3')}</h3>
            <p>{t('ld2.k3t')}</p>
          </div>
          <div className="ld-kid-card sun">
            <span className="ld-kid-icon"><Animal id="rabbit" size={46} /><Animal id="fox" size={46} /></span>
            <h3>{t('ld2.k4')}</h3>
            <p>{t('ld2.k4t')}</p>
          </div>
        </div>
      </section>

      <section className="ld-family">
        <div className="ld-wrap ld-split">
          <div className="stack" style={{ gap: 14 }}>
            <h2>{t('ld2.parentH')}</h2>
            <p>{t('ld2.parentT')}</p>
            <ul className="ld-checks">
              <li>{t('ld2.p1')}</li>
              <li>{t('ld2.p2')}</li>
              <li>{t('ld2.p3')}</li>
              <li>{t('ld2.p4')}</li>
              <li>{t('ld2.p5')}</li>
            </ul>
          </div>
          <div className="ld-demo" aria-label={t('ld.demoAria')}>
            <div className="ld-demo-head">
              <span className="flag-icon"><FlagIcon flag="red" size={26} /></span>
              <div className="stack" style={{ gap: 2 }}>
                <span className="tiny" style={{ color: 'inherit', opacity: 0.85 }}>{t('ld.demoProduct')}</span>
                <strong>{t('f.notFor', { names: ['Nora', 'Emil'] })}</strong>
              </div>
            </div>
            <div className="stack" style={{ gap: 8, padding: 12 }}>
              <DemoPerson animal="rabbit" name="Nora" flag="red" text={t('h.contains', { items: ['@label.coeliacGluten'] })} icon="coeliac" />
              <DemoPerson animal="fox" name="Emil" flag="red" text={t('h.contains', { items: ['@allergen.egg'] })} icon="egg" />
              <DemoPerson animal="bear" name="Ola" flag="green" text={t('h.noneFound', { name: 'Ola' })} />
            </div>
          </div>
        </div>
      </section>

      <section className="ld-wrap ld-section">
        <h2>{t('ld2.dayH')}</h2>
        <ol className="ld-day">
          {[
            { k: 'd1', icon: <FoodSticker kind="bread" size={40} /> },
            { k: 'd2', icon: <Animal id="owl" size={40} /> },
            { k: 'd3', icon: <span className="ld-kid-emoji" aria-hidden="true">🎂</span> },
            { k: 'd4', icon: <span className="ld-kid-emoji" aria-hidden="true">🍬</span> },
            { k: 'd5', icon: <Mascot mood="wave" size={44} /> }
          ].map((d) => (
            <li key={d.k}>
              <span className="ld-day-icon">{d.icon}</span>
              <div className="stack" style={{ gap: 2 }}>
                <h3>{t(`ld2.${d.k}`)}</h3>
                <p className="muted">{t(`ld2.${d.k}t`)}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="ld-wrap ld-section">
        <h2>{t('ld.lights')}</h2>
        <div className="ld-lights">
          {FLAGS.map((f) => (
            <div key={f.flag} className={`ld-light ${f.flag}`}>
              <Mascot mood={f.mood} size={84} />
              <div className="stack" style={{ gap: 4 }}>
                <span className="row" style={{ gap: 8 }}>
                  <span className={`person-word ${f.flag}`}>{t(`word.${f.flag}`)}</span>
                  <h3>{t(`ld.light.${f.flag}`)}</h3>
                </span>
                <p className="muted">{t(`ld.light.${f.flag}.text`)}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="ld-note">
          {t('ld.noPack')}
        </p>
      </section>

      <section className="ld-family">
        <div className="ld-wrap ld-split">
          <div className="stack" style={{ gap: 14 }}>
            <h2>{t('ld.fam')}</h2>
            <p>{t('ld.famt')}</p>
            <ul className="ld-list">
              <li>{t('ld.f1')}</li>
              <li>{t('ld.f2')}</li>
              <li>{t('ld.f3')}</li>
              <li>{t('ld.f4')}</li>
            </ul>
          </div>
          <div className="ld-demo" aria-label={t('ld.demoAria')}>
            <div className="ld-demo-head">
              <span className="flag-icon"><FlagIcon flag="red" size={26} /></span>
              <div className="stack" style={{ gap: 2 }}>
                <span className="tiny" style={{ color: 'inherit', opacity: 0.85 }}>{t('ld.demoProduct')}</span>
                <strong>{t('f.notFor', { names: ['Nora', 'Emil'] })}</strong>
              </div>
            </div>
            <div className="stack" style={{ gap: 8, padding: 12 }}>
              <DemoPerson animal="rabbit" name="Nora" flag="red" text={t('h.contains', { items: ['@label.coeliacGluten'] })} icon="coeliac" />
              <DemoPerson animal="fox" name="Emil" flag="red" text={t('h.contains', { items: ['@allergen.egg'] })} icon="egg" />
              <DemoPerson animal="bear" name="Ola" flag="green" text={t('h.noneFound', { name: 'Ola' })} />
            </div>
          </div>
        </div>
      </section>

      <section className="ld-wrap ld-section">
        <h2>{t('ld.priv')}</h2>
        <p className="muted ld-narrow-p">{t('ld.privt')}</p>
        <div className="ld-privacy">
          {PRIVACY.map((p) => (
            <div key={p} className="ld-privacy-item">
              <span className="ld-check" aria-hidden="true">✓</span>
              <div className="stack" style={{ gap: 4 }}>
                <h3>{t(`ld.p.${p}`)}</h3>
                <p className="muted">{t(`ld.p.${p}.text`)}</p>
              </div>
            </div>
          ))}
        </div>
        <Link href="/personvern">{t('ld.privLink')}</Link>
      </section>

      <section className="ld-wrap ld-final">
        <Mascot mood="wave" size={120} />
        <div className="stack" style={{ gap: 10 }}>
          <h2>{t('ld2.finalH')}</h2>
          <p className="muted">{t('ld2.finalT')}</p>
          <Link className="btn btn-primary" href="/logg-inn" style={{ alignSelf: 'flex-start', width: 'auto' }}>{t('ld2.start')}</Link>
        </div>
      </section>

      <footer className="ld-foot ld-wrap">
        <span>{t('ld.by')}</span>
        <span>
          <Link href="/personvern">{t('privacy')}</Link> · <Link href="/vilkar">{t('terms.link')}</Link> · <Link href="/logg-inn">{t('ld.login')}</Link>
        </span>
      </footer>
    </div>
  )
}

function DemoPerson({
  animal,
  name,
  flag,
  text,
  icon
}: {
  animal: 'rabbit' | 'fox' | 'bear'
  name: string
  flag: 'red' | 'green'
  text: string
  icon?: 'coeliac' | 'egg'
}) {
  const { t } = useT()
  return (
    <div className={`person-card ${flag}`} style={{ alignItems: 'center' }}>
      <span className="person-avatar" aria-hidden="true">
        <Animal id={animal} size={44} />
        <span className={`person-badge ${flag}`}><FlagIcon flag={flag} size={16} /></span>
      </span>
      <div className="stack" style={{ gap: 2, flex: 1, minWidth: 0 }}>
        <span className="row" style={{ justifyContent: 'space-between', gap: 8 }}>
          <strong>{name}</strong>
          <span className={`person-word ${flag}`}>{t(`word.${flag}`)}</span>
        </span>
        <span className="small row" style={{ gap: 6 }}>
          {icon && <AllergenIcon k={icon} size={20} />}
          {text}
        </span>
      </div>
    </div>
  )
}

/** Telefon som viser barnemodus, og varselet forelderen får. */
function KidPhone() {
  const { t } = useT()
  return (
    <div className="ld-phone-wrap" aria-hidden="true">
      <div className="ld-phone">
        <div className="ld-phone-notch" />
        <div className="ld-phone-screen">
          <div className="ld-phone-hi">
            <Animal id="rabbit" size={40} />
            <strong>{t('ld2.mockHi', { name: 'Emma' })}</strong>
          </div>
          <div className="ld-phone-result">
            <Mascot mood="happy" size={96} />
            <span className="ld-phone-ok">{t('word.green')}</span>
            <strong>{t('ld2.mockOk')}</strong>
            <span className="small">{t('ld2.mockOkSub')}</span>
          </div>
          <div className="ld-phone-btns">
            <span className="ld-phone-btn">🔊 {t('ld2.mockRead')}</span>
            <span className="ld-phone-btn call">📞 {t('ld2.mockCall')}</span>
          </div>
        </div>
      </div>
      <div className="ld-notif">
        <span className="ld-notif-flag"><FlagIcon flag="red" size={18} /></span>
        <div className="stack" style={{ gap: 0 }}>
          <strong>{t('ld2.mockNotif', { name: 'Emil' })}</strong>
          <span className="tiny">{t('ld2.mockNotifSub')}</span>
        </div>
      </div>
    </div>
  )
}
