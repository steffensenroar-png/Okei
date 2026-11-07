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
          <h1>{t('ld.h1')}</h1>
          <p className="ld-lead">
            {t('ld.lead')}
          </p>
          <div className="ld-cta">
            <Link className="btn btn-primary" href="/logg-inn">{t('ld.start')}</Link>
            <a className="btn" href="#slik">{t('ld.how')}</a>
          </div>
          <p className="tiny">{t('ld.free')}</p>
        </div>
        <div className="hero-art ld-hero-art" aria-hidden="true">
          <span className="sticker s1"><FoodSticker kind="apple" size={56} /></span>
          <span className="sticker s2"><FoodSticker kind="milk" size={52} /></span>
          <span className="sticker s3"><FoodSticker kind="bread" size={54} /></span>
          <span className="sticker s4"><FoodSticker kind="egg" size={44} /></span>
          <span className="sticker s5"><FoodSticker kind="fish" size={56} /></span>
          <span className="sticker s6"><FoodSticker kind="carrot" size={52} /></span>
          <Mascot mood="happy" size={200} />
        </div>
      </section>

      <section className="ld-why">
        <div className="ld-wrap ld-narrow">
          <h2>{t('ld.why')}</h2>
          <p>
            {t('ld.why1')}
          </p>
          <p>
            {t('ld.why2')}
          </p>
        </div>
      </section>

      <section id="slik" className="ld-wrap ld-section">
        <h2>{t('ld.steps')}</h2>
        <ol className="ld-steps">
          <li>
            <div className="ld-step-art">
              <Animal id="bear" size={52} />
              <Animal id="rabbit" size={52} />
              <Animal id="fox" size={52} />
            </div>
            <h3>{t('ld.s1')}</h3>
            <p className="muted">{t('ld.s1t')}</p>
          </li>
          <li>
            <div className="ld-step-art">
              <span className="ld-chip sky"><ModeArt mode="barcode" size={42} /></span>
              <span className="ld-chip sun"><ModeArt mode="label" size={42} /></span>
              <span className="ld-chip peach"><ModeArt mode="food" size={42} /></span>
            </div>
            <h3>{t('ld.s2')}</h3>
            <p className="muted">{t('ld.s2t')}</p>
          </li>
          <li>
            <div className="ld-step-art">
              <span className="ld-flag red"><FlagIcon flag="red" size={26} /></span>
              <span className="ld-flag yellow"><FlagIcon flag="yellow" size={26} /></span>
              <span className="ld-flag green"><FlagIcon flag="green" size={26} /></span>
            </div>
            <h3>{t('ld.s3')}</h3>
            <p className="muted">{t('ld.s3t')}</p>
          </li>
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
          <h2>{t('ld.try')}</h2>
          <p className="muted">{t('ld.tryt')}</p>
          <Link className="btn btn-primary" href="/logg-inn" style={{ alignSelf: 'flex-start', width: 'auto' }}>{t('ld.start')}</Link>
        </div>
      </section>

      <footer className="ld-foot ld-wrap">
        <span>{t('ld.by')}</span>
        <span>
          <Link href="/personvern">{t('privacy')}</Link> · <Link href="/logg-inn">{t('ld.login')}</Link>
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
