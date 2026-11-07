import Link from 'next/link'
import { Animal, FoodSticker, Mascot, ModeArt } from '@/components/Art'
import { FlagIcon, Logo } from '@/components/Icons'
import AllergenIcon from '@/components/AllergenIcon'
import SignedInRedirect from '@/components/SignedInRedirect'

export const metadata = {
  title: 'Okei – sjekk mat mot allergiene i familien',
  description:
    'Ta bilde av ingredienslisten eller skann strekkoden. Okei sjekker mot allergiene til deg og barna og svarer med rødt, gult eller grønt.'
}

const FLAGS = [
  {
    flag: 'red' as const,
    mood: 'stop' as const,
    word: 'Nei',
    title: 'Rødt: ikke spis',
    text: 'Varen inneholder noe personen ikke tåler. Ved alvorlig allergi gir også «kan inneholde spor» rødt.'
  },
  {
    flag: 'yellow' as const,
    mood: 'unsure' as const,
    word: 'Usikkert',
    title: 'Gult: sjekk selv',
    text: 'Spor, uklar tekst eller mat uten pakke. Okei viser hva som er usikkert, så du kan lese etiketten eller spørre.'
  },
  {
    flag: 'green' as const,
    mood: 'happy' as const,
    word: 'OK',
    title: 'Grønt: ingen treff',
    text: 'Ingen av allergenene ble funnet i ingredienslisten eller produktdataene. Les likevel etiketten, oppskrifter endres.'
  }
]

const PRIVACY = [
  { title: 'Et oppslagsverk, ikke en lege', text: 'Okei leser etiketter og produktdata. Det stiller ingen diagnose. Ved alvorlig reaksjon: ring 113.' },
  { title: 'Bildene lagres ikke', text: 'Bildet sendes til en AI-tjeneste som leser teksten, og forkastes etterpå. Bare resultatet lagres.' },
  { title: 'Lagret i EU', text: 'Profiler og historikk ligger i en database i Stockholm, beskyttet slik at bare du ser dine data.' },
  { title: 'Ingen reklame, ingen salg', text: 'Vi selger aldri data og bruker dem ikke til annonser.' },
  { title: 'Du bestemmer', text: 'Slett profiler og historikk selv, når du vil. Allergier er helseopplysninger, og du samtykker før første bruk.' },
  { title: 'Åpent for barna', text: 'Et barn som kobles til familien, ser alltid i appen hvem som ser skannene. Begge kan koble fra.' }
]

export default function Landing() {
  return (
    <div className="landing">
      <SignedInRedirect />

      <header className="ld-top ld-wrap">
        <Logo />
        <Link className="btn btn-small" href="/logg-inn">Logg inn</Link>
      </header>

      <section className="ld-hero ld-wrap">
        <div className="ld-hero-text">
          <h1>Mat som passer hele familien.</h1>
          <p className="ld-lead">
            Ta bilde av ingredienslisten eller skann strekkoden. Okei sjekker mot allergiene til deg og barna, og svarer med rødt, gult eller grønt på sekunder.
          </p>
          <div className="ld-cta">
            <Link className="btn btn-primary" href="/logg-inn">Kom i gang gratis</Link>
            <a className="btn" href="#slik">Se hvordan</a>
          </div>
          <p className="tiny">Gratis mens Okei er i beta. Logg inn med Google.</p>
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
          <h2>Laget for å gjøre hverdagen med allergi lettere</h2>
          <p>
            Lever du med matallergi, eller har du barn som gjør det, vet du hvor mye tid som går med til å lese små bokstaver i butikken, lete etter «kan inneholde spor» og ringe hjem for å spørre om en bolle er trygg.
          </p>
          <p>
            Okei tar den jobben. Appen leser etiketten for deg og sier tydelig fra om noe ikke passer, slik at handleturen, bursdagen og matpakken blir litt enklere.
          </p>
        </div>
      </section>

      <section id="slik" className="ld-wrap ld-section">
        <h2>Slik virker det</h2>
        <ol className="ld-steps">
          <li>
            <div className="ld-step-art">
              <Animal id="bear" size={52} />
              <Animal id="rabbit" size={52} />
              <Animal id="fox" size={52} />
            </div>
            <h3>Velg hvem du handler for</h3>
            <p className="muted">Én profil per person med allergier, cøliaki eller laktoseintoleranse. Velg én, eller hele familien.</p>
          </li>
          <li>
            <div className="ld-step-art">
              <span className="ld-chip sky"><ModeArt mode="barcode" size={42} /></span>
              <span className="ld-chip sun"><ModeArt mode="label" size={42} /></span>
              <span className="ld-chip peach"><ModeArt mode="food" size={42} /></span>
            </div>
            <h3>Skann eller ta bilde</h3>
            <p className="muted">Strekkode slås opp i norske produktdata. Ingredienslister leses fra bildet. Mat uten pakke gjettes ut fra et foto.</p>
          </li>
          <li>
            <div className="ld-step-art">
              <span className="ld-flag red"><FlagIcon flag="red" size={26} /></span>
              <span className="ld-flag yellow"><FlagIcon flag="yellow" size={26} /></span>
              <span className="ld-flag green"><FlagIcon flag="green" size={26} /></span>
            </div>
            <h3>Få svar på sekunder</h3>
            <p className="muted">Du ser hvilke ingredienser som utløste svaret, markert i ingredienslisten.</p>
          </li>
        </ol>
      </section>

      <section className="ld-wrap ld-section">
        <h2>Rødt, gult og grønt</h2>
        <div className="ld-lights">
          {FLAGS.map((f) => (
            <div key={f.flag} className={`ld-light ${f.flag}`}>
              <Mascot mood={f.mood} size={84} />
              <div className="stack" style={{ gap: 4 }}>
                <span className="row" style={{ gap: 8 }}>
                  <span className={`person-word ${f.flag}`}>{f.word}</span>
                  <h3>{f.title}</h3>
                </span>
                <p className="muted">{f.text}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="ld-note">
          Mat uten pakke får aldri grønt. Et foto av en bolle er en gjetning, og da sier vi det.
        </p>
      </section>

      <section className="ld-family">
        <div className="ld-wrap ld-split">
          <div className="stack" style={{ gap: 14 }}>
            <h2>Én sjekk for hele familien</h2>
            <p>Står du i butikken med tre barn med ulike allergier, får du ett samlet svar og et kort per barn.</p>
            <ul className="ld-list">
              <li>Cøliaki og laktoseintoleranse legges inn som tilstander. Okei vet hva det betyr for ingredienslisten.</li>
              <li>Okei foreslår lignende varer som passer alle du handler for.</li>
              <li>Barna velger sitt eget dyr, og appen kan ha rosa, blå eller sin egen farge.</li>
              <li>Barnet kan få Okei på sin egen telefon. Du ser det barnet skanner.</li>
            </ul>
          </div>
          <div className="ld-demo" aria-label="Eksempel på et resultat for en familie">
            <div className="ld-demo-head">
              <span className="flag-icon"><FlagIcon flag="red" size={26} /></span>
              <div className="stack" style={{ gap: 2 }}>
                <span className="tiny" style={{ color: 'inherit', opacity: 0.85 }}>Grønnsakspostei</span>
                <strong>Ikke for Nora og Emil</strong>
              </div>
            </div>
            <div className="stack" style={{ gap: 8, padding: 12 }}>
              <DemoPerson animal="rabbit" name="Nora" flag="red" text="Inneholder gluten (cøliaki)" icon="coeliac" />
              <DemoPerson animal="fox" name="Emil" flag="red" text="Inneholder egg" icon="egg" />
              <DemoPerson animal="bear" name="Ola" flag="green" text="Ingen av Olas allergener funnet" />
            </div>
          </div>
        </div>
      </section>

      <section className="ld-wrap ld-section">
        <h2>Sikkerhet og personvern</h2>
        <p className="muted ld-narrow-p">Allergier er helseopplysninger. Vi behandler dem deretter.</p>
        <div className="ld-privacy">
          {PRIVACY.map((p) => (
            <div key={p.title} className="ld-privacy-item">
              <span className="ld-check" aria-hidden="true">✓</span>
              <div className="stack" style={{ gap: 4 }}>
                <h3>{p.title}</h3>
                <p className="muted">{p.text}</p>
              </div>
            </div>
          ))}
        </div>
        <Link href="/personvern">Les hele personvernerklæringen</Link>
      </section>

      <section className="ld-wrap ld-final">
        <Mascot mood="wave" size={120} />
        <div className="stack" style={{ gap: 10 }}>
          <h2>Prøv Okei i betaen</h2>
          <p className="muted">Gratis mens vi tester. Si fra i appen når noe blir feil, så blir den bedre for alle.</p>
          <Link className="btn btn-primary" href="/logg-inn" style={{ alignSelf: 'flex-start', width: 'auto' }}>Kom i gang gratis</Link>
        </div>
      </section>

      <footer className="ld-foot ld-wrap">
        <span>Okei er laget av Steffin AS i Vesterålen.</span>
        <span>
          <Link href="/personvern">Personvern</Link> · <Link href="/logg-inn">Logg inn</Link>
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
  return (
    <div className={`person-card ${flag}`} style={{ alignItems: 'center' }}>
      <span className="person-avatar" aria-hidden="true">
        <Animal id={animal} size={44} />
        <span className={`person-badge ${flag}`}><FlagIcon flag={flag} size={16} /></span>
      </span>
      <div className="stack" style={{ gap: 2, flex: 1, minWidth: 0 }}>
        <span className="row" style={{ justifyContent: 'space-between', gap: 8 }}>
          <strong>{name}</strong>
          <span className={`person-word ${flag}`}>{flag === 'red' ? 'Nei' : 'OK'}</span>
        </span>
        <span className="small row" style={{ gap: 6 }}>
          {icon && <AllergenIcon k={icon} size={20} />}
          {text}
        </span>
      </div>
    </div>
  )
}
