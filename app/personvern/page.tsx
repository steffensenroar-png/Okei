import Link from 'next/link'
import type { Metadata } from 'next'
import { Logo } from '@/components/Icons'

export const metadata: Metadata = { title: 'Personvern – Okei' }

export default function Personvern() {
  return (
    <main className="page" style={{ paddingBottom: 40, lineHeight: 1.6 }}>
      <Link href="/" style={{ textDecoration: 'none' }}><Logo /></Link>
      <h1>Personvernerklæring</h1>
      <p className="tiny">Gjelder beta. Sist oppdatert 7. november 2026.</p>

      <section className="stack">
        <h2>Hvem er ansvarlig</h2>
        <p>Okei drives av Steffin AS (org.nr. 824 379 602), Vikaveien 10, 8445 Melbu. Spørsmål om personvern: steffensenroar@gmail.com.</p>
      </section>

      <section className="stack">
        <h2>Hva vi lagrer</h2>
        <ul style={{ margin: 0, paddingLeft: 20 }}>
          <li>E-postadresse og navn fra innloggingen (Google eller e-postlenke).</li>
          <li>Profilene du lager: navn, valgfritt fødselsår, allergier og alvorlighetsgrad. Allergier er helseopplysninger.</li>
          <li>Resultatene av skann: produktnavn, ingrediensliste, flagg og eventuell tilbakemelding.</li>
        </ul>
        <p>Bilder du tar lagres ikke av Okei. De sendes til analyse og forkastes.</p>
      </section>

      <section className="stack">
        <h2>Familiekobling</h2>
        <p>En forelder kan gi et barn en kode. Når barnet logger inn med egen konto og bruker koden, sjekker barnets telefon mat mot profilen forelderen har laget. Forelderen ser da barnets skann: produkt, flagg og tidspunkt. Barnet ser i appen hvem som ser skannene. Begge kan fjerne koblingen når som helst, og da slutter delingen.</p>
      </section>

      <section className="stack">
        <h2>Hvorfor og på hvilket grunnlag</h2>
        <p>Vi bruker opplysningene bare for å vise deg om maten passer profilen, og for å forbedre treffsikkerheten i betaen. Helseopplysningene behandles på grunnlag av ditt uttrykkelige samtykke, som du gir før første bruk. Du kan trekke samtykket ved å slette profilene og historikken.</p>
      </section>

      <section className="stack">
        <h2>Hvem som behandler data for oss</h2>
        <ul style={{ margin: 0, paddingLeft: 20 }}>
          <li>Supabase: database og innlogging, lagret i EU (Stockholm).</li>
          <li>Vercel: drift av nettsiden.</li>
          <li>Anthropic: leser bilder av ingredienslister og mat. Bildet sendes uten navn eller profil. Anthropic er et amerikansk selskap.</li>
          <li>Kassalapp og Open Food Facts: oppslag på strekkode. Bare strekkoden sendes.</li>
        </ul>
        <p>Vi selger aldri data og bruker dem ikke til reklame.</p>
      </section>

      <section className="stack">
        <h2>Dine rettigheter</h2>
        <p>Du kan se, endre og slette profilene dine og historikken i appen. Vil du ha hele kontoen slettet, eller innsyn i alt vi har, send e-post til adressen over. Du kan klage til Datatilsynet.</p>
      </section>

      <section className="stack">
        <h2>Viktig</h2>
        <p>Okei er et oppslagsverk og erstatter ikke lege. Sjekk alltid etiketten. Ved alvorlig allergisk reaksjon: ring 113.</p>
      </section>
    </main>
  )
}
