'use client'

import Link from 'next/link'
import { Logo } from '@/components/Icons'
import { useT } from '@/components/I18n'

export default function Privacy() {
  const { lang } = useT()
  if (lang !== 'no') return <PrivacyEn />
  return (
    <main className="page" style={{ paddingBottom: 40, lineHeight: 1.6 }}>
      <Link href="/" style={{ textDecoration: 'none' }}><Logo /></Link>
      <h1>Personvernerklæring</h1>
      <p className="tiny">Gjelder beta. Sist oppdatert 12. november 2026.</p>

      <section className="stack">
        <h2>Hvem er ansvarlig</h2>
        <p>Okei drives av Makeway AS (org.nr. 912 444 376), 8445 Melbu. Makeway AS er behandlingsansvarlig og selger av abonnementet. Spørsmål om personvern: steffensenroar@gmail.com.</p>
      </section>

      <section className="stack">
        <h2>Hva vi lagrer</h2>
        <ul style={{ margin: 0, paddingLeft: 20 }}>
          <li>E-postadresse og navn fra innloggingen (Google eller e-postlenke).</li>
          <li>Profilene du lager: navn, valgfritt fødselsår, allergier og alvorlighetsgrad. Allergier er helseopplysninger.</li>
          <li>Valgfritt profilbilde. Det lagres lite (320 × 320 piksler) og vises for familien og på allergikort du deler.</li>
          <li>Resultatene av skann: produktnavn, ingrediensliste, flagg og eventuell tilbakemelding.</li>
        </ul>
        <p>Bilder du tar lagres ikke av Okei. De sendes til analyse og forkastes.</p>
      </section>

      <section className="stack">
        <h2>Familiekobling</h2>
        <p>En forelder kan gi et barn en kode. Når barnet logger inn med egen konto og bruker koden, sjekker barnets telefon mat mot profilen forelderen har laget. Forelderen ser da barnets skann: produkt, flagg og tidspunkt. Barnet ser i appen hvem som ser skannene. Begge kan fjerne koblingen når som helst, og da slutter delingen.</p>
      </section>

      <section className="stack">
        <h2>Delte allergikort</h2>
        <p>Du kan lage en lenke til et allergikort. Den som har lenken, ser navn, bilde eller dyr, allergier, tilstander, egne ord og nødinfo for profilene du har valgt, og kan skanne varer mot dem uten å logge inn. Det som skannes via lenken, lagres ikke. Du kan trekke lenken tilbake når som helst, og den slutter å virke etter 180 dager.</p>
      </section>

      <section className="stack">
        <h2>Tilbakekallinger, trygge varer og bruk</h2>
        <p>Okei henter Mattilsynets offentlige liste over tilbakekallinger. Sammenligningen med varene du har skannet skjer på din telefon, og ingenting om deg sendes til Mattilsynet. Varer du lagrer som trygge, lagres med ingrediensliste så vi kan si fra om den endres. Vi logger når du bruker bildeskann, for å holde taket på antall skann per døgn.</p>
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
          <li>Anthropic: leser og oversetter bilder av ingredienslister og mat. Bildet sendes uten navn eller profil. Anthropic er et amerikansk selskap.</li>
          <li>Kassalapp og Open Food Facts: oppslag på strekkode. Bare strekkoden sendes.</li>
          <li>Stripe: betaling av abonnement. Stripe behandler kortopplysningene. Vi lagrer abonnement, beløp og eventuell kampanjekode.</li>
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

function PrivacyEn() {
  return (
    <main className="page" style={{ paddingBottom: 40, lineHeight: 1.6 }}>
      <Link href="/" style={{ textDecoration: 'none' }}><Logo /></Link>
      <h1>Privacy policy</h1>
      <p className="tiny">Beta version. Last updated 12 November 2026. This is a translation; the Norwegian version applies.</p>

      <section className="stack">
        <h2>Who is responsible</h2>
        <p>Okei is run by Makeway AS (org. no. 912 444 376), 8445 Melbu, Norway. Makeway AS is the data controller and the seller of the subscription. Privacy questions: steffensenroar@gmail.com.</p>
      </section>

      <section className="stack">
        <h2>What we store</h2>
        <ul style={{ margin: 0, paddingLeft: 20 }}>
          <li>Email address and name from your sign-in (Google or email link).</li>
          <li>The profiles you create: name, optional birth year, allergies and severity. Allergies are health data.</li>
          <li>An optional profile photo. It is stored small (320 × 320 pixels) and shown to your family and on allergy cards you share.</li>
          <li>Scan results: product name, ingredient list, flag and any feedback.</li>
        </ul>
        <p>Okei does not store the photos you scan. They are sent for analysis and discarded.</p>
      </section>

      <section className="stack">
        <h2>Family link</h2>
        <p>A parent can give a child a code. When the child signs in with their own account and uses the code, the child&apos;s phone checks food against the profile the parent created. The parent then sees the child&apos;s scans: product, flag and time. The child can see in the app who sees the scans. Either can remove the link at any time, and sharing stops.</p>
      </section>

      <section className="stack">
        <h2>Shared allergy cards</h2>
        <p>You can create a link to an allergy card. Anyone with the link sees name, photo or animal, allergies, conditions, custom words and emergency info for the profiles you chose, and can scan products against them without signing in. Scans made through the link are not stored. You can revoke the link at any time, and it stops working after 180 days.</p>
      </section>

      <section className="stack">
        <h2>Recalls, safe products and usage</h2>
        <p>Okei fetches the Norwegian Food Safety Authority&apos;s public list of recalls. The comparison with products you have scanned happens on your phone, and nothing about you is sent to the authority. Products you save as safe are stored with their ingredient list so we can tell you if it changes. We log when you use photo scans, to enforce the daily limit.</p>
      </section>

      <section className="stack">
        <h2>Why, and on what basis</h2>
        <p>We use the information only to show you whether food suits a profile, and to improve accuracy during the beta. Health data is processed on the basis of your explicit consent, given before first use. You can withdraw consent by deleting your profiles and history.</p>
      </section>

      <section className="stack">
        <h2>Who processes data for us</h2>
        <ul style={{ margin: 0, paddingLeft: 20 }}>
          <li>Supabase: database and sign-in, stored in the EU (Stockholm).</li>
          <li>Vercel: hosting of the website.</li>
          <li>Anthropic: reads and translates photos of ingredient lists and food. The photo is sent without name or profile. Anthropic is a US company.</li>
          <li>Kassalapp and Open Food Facts: barcode lookup. Only the barcode is sent.</li>
          <li>Stripe: subscription payments. Stripe handles card details. We store the subscription, amount and any campaign code.</li>
        </ul>
        <p>We never sell data and do not use it for advertising.</p>
      </section>

      <section className="stack">
        <h2>Your rights</h2>
        <p>You can view, change and delete your profiles and history in the app. To have your whole account deleted, or to see everything we hold, email the address above. You can complain to the Norwegian Data Protection Authority (Datatilsynet).</p>
      </section>

      <section className="stack">
        <h2>Important</h2>
        <p>Okei is a reference tool and does not replace a doctor. Always check the label. In a severe allergic reaction, call the emergency number (113 in Norway, 112 in the EU).</p>
      </section>
    </main>
  )
}
