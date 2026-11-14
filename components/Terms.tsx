'use client'

import Link from 'next/link'
import { Logo } from '@/components/Icons'
import { useT } from '@/components/I18n'
import { PLANS, TRIAL_DAYS } from '@/lib/plans'

const COMPANY = 'Makeway AS (org.nr. 912 444 376), Vikaveien 10, 8445 Melbu'
const EMAIL = 'steffensenroar@gmail.com'
const kr = (n: number) => new Intl.NumberFormat('nb-NO').format(n)

function S({ h, children }: { h: string; children: React.ReactNode }) {
  return (
    <section className="stack">
      <h2>{h}</h2>
      {children}
    </section>
  )
}

const ul = { margin: 0, paddingLeft: 20 } as const

export default function Terms() {
  const { lang } = useT()
  if (lang !== 'no') return <TermsEn />
  const p = PLANS
  return (
    <main className="page" style={{ paddingBottom: 40, lineHeight: 1.6 }}>
      <Link href="/" style={{ textDecoration: 'none' }}><Logo /></Link>
      <h1>Vilkår for Okei</h1>
      <p className="tiny">Sist oppdatert 14. november 2026.</p>

      <S h="1. Hvem du har avtale med">
        <p>Okei leveres av {COMPANY}. Kontakt: {EMAIL}. Vilkårene gjelder bruk av Okei på erdetokei.no og i appene for iPhone og Android, og kjøp av abonnement.</p>
      </S>

      <S h="2. Hva Okei er, og hva Okei ikke er">
        <p>Okei er et oppslagsverk som sjekker matvarer mot allergiene og kostholdet du har lagt inn. Svarene bygger på produktdata og tekst som leses av AI, og de kan være feil eller ufullstendige.</p>
        <ul style={ul}>
          <li>Okei er ikke medisinsk utstyr og erstatter ikke lege eller ernæringsfysiolog.</li>
          <li>Les alltid etiketten på varen før den spises. Etiketten gjelder foran Okei.</li>
          <li>Ved alvorlig allergisk reaksjon: ring 113.</li>
        </ul>
      </S>

      <S h="3. Konto og familie">
        <p>Du må være 18 år for å opprette konto som forelder og kjøpe abonnement. Barn kan bruke Okei gjennom en familiekobling som en forelder setter opp, og forelderen er ansvarlig for barnets bruk. Hold innloggingen din for deg selv, og del ikke kontoen utenfor familien.</p>
      </S>

      <S h="4. Abonnement og pris">
        <p>Strekkodeskann er gratis. Abonnement gir ubegrenset fotoskann og flere funksjoner. Prisene er inkludert merverdiavgift:</p>
        <ul style={ul}>
          <li>Okei Personlig: {kr(p.personal.month)} kr per måned eller {kr(p.personal.year)} kr per år.</li>
          <li>Okei Familie: {kr(p.family.month)} kr per måned eller {kr(p.family.year)} kr per år.</li>
        </ul>
        <p>Prisen du betaler, vises før du bekrefter kjøpet. Abonnementet fornyes automatisk for en ny måned eller et nytt år til du sier det opp.</p>
      </S>

      <S h="5. Gratis prøveperiode">
        <p>Nye abonnenter får {TRIAL_DAYS} dager gratis. Du legger inn betalingskort ved start, men blir ikke trukket før prøveperioden er over. Sier du opp før prøveperioden slutter, betaler du ingenting. Prøveperioden gis én gang per person.</p>
      </S>

      <S h="6. Betaling">
        <ul style={ul}>
          <li>På erdetokei.no betaler du med kort gjennom Stripe. Okei ser ikke kortnummeret ditt.</li>
          <li>Kjøper du i appen for iPhone eller Android, skjer betalingen gjennom App Store eller Google Play, og deres kjøpsvilkår gjelder i tillegg.</li>
          <li>Feiler en betaling, kan vi prøve igjen. Lykkes det ikke, stopper abonnementet, og du beholder gratisdelen.</li>
        </ul>
      </S>

      <S h="7. Oppsigelse">
        <p>Du kan si opp når som helst. Abonnementet varer da ut perioden du har betalt for, og fornyes ikke. Du får ikke tilbake penger for en påbegynt periode, med unntak av angreretten under.</p>
        <ul style={ul}>
          <li>Kjøpt på erdetokei.no: si opp under Abonnement, med knappen «Administrer eller si opp», eller send e-post til {EMAIL}.</li>
          <li>Kjøpt i appen: si opp i abonnementsinnstillingene på telefonen (Apple-ID eller Google Play).</li>
        </ul>
      </S>

      <S h="8. Angrerett">
        <p>Du har 14 dagers angrerett etter angrerettloven fra avtalen er inngått. Gi beskjed på e-post innen fristen. Har du bedt om at tjenesten starter med en gang og betalt i angrefristen, får du pengene tilbake, men vi kan trekke fra en forholdsmessig del for tiden du har brukt tjenesten. Kjøp i appen angres gjennom App Store eller Google Play.</p>
      </S>

      <S h="9. Rabattkoder">
        <p>En rabattkode gir rabatten og varigheten som vises ved kjøpet. Koder kan ikke byttes i penger og kan ikke kombineres med andre koder.</p>
      </S>

      <S h="10. Endringer i pris og vilkår">
        <p>Vi varsler deg på e-post minst 30 dager før en prisøkning eller en vesentlig endring i vilkårene trer i kraft. Vil du ikke fortsette, kan du si opp før endringen gjelder.</p>
      </S>

      <S h="11. Ansvar">
        <p>Vi gjør vårt beste for at Okei er riktig og tilgjengelig, men vi kan ikke garantere at alle svar er korrekte eller at tjenesten alltid virker. Så langt loven tillater, er vi ikke ansvarlige for tap som følger av feil i produktdata, i AI-tolkning eller av at etiketten ikke er lest. Rettighetene dine som forbruker etter norsk lov gjelder alltid.</p>
      </S>

      <S h="12. Riktig bruk">
        <p>Du kan ikke bruke Okei til å skade andre, prøve å omgå sikkerheten, hente ut data automatisk eller selge tjenesten videre. Bryter du vilkårene, kan vi stenge kontoen etter varsel.</p>
      </S>

      <S h="13. Personvern">
        <p>Hvordan vi behandler opplysningene dine, står i <Link href="/personvern">personvernerklæringen</Link>.</p>
      </S>

      <S h="14. Lov og tvister">
        <p>Norsk lov gjelder. Ta gjerne kontakt med oss først hvis du er misfornøyd. Som forbruker kan du også klage til Forbrukerrådet, som kan mekle, og saken kan deretter bringes inn for Forbrukerklageutvalget.</p>
      </S>
    </main>
  )
}

function TermsEn() {
  const p = PLANS
  return (
    <main className="page" style={{ paddingBottom: 40, lineHeight: 1.6 }}>
      <Link href="/" style={{ textDecoration: 'none' }}><Logo /></Link>
      <h1>Okei terms</h1>
      <p className="tiny">Last updated 14 November 2026. The Norwegian version applies if the two differ.</p>

      <S h="1. Who you have an agreement with">
        <p>Okei is provided by Makeway AS (org. no. 912 444 376), Vikaveien 10, 8445 Melbu, Norway. Contact: {EMAIL}. These terms apply to Okei on erdetokei.no and in the iPhone and Android apps, and to subscription purchases.</p>
      </S>

      <S h="2. What Okei is, and what it is not">
        <p>Okei is a reference tool that checks food against the allergies and diet you have entered. Answers are based on product data and text read by AI, and they can be wrong or incomplete.</p>
        <ul style={ul}>
          <li>Okei is not a medical device and does not replace a doctor or dietitian.</li>
          <li>Always read the label before eating. The label takes precedence over Okei.</li>
          <li>In a severe allergic reaction, call the emergency number (113 in Norway).</li>
        </ul>
      </S>

      <S h="3. Account and family">
        <p>You must be 18 to create a parent account and buy a subscription. Children can use Okei through a family link set up by a parent, who is responsible for the child’s use. Keep your login to yourself and do not share the account outside your family.</p>
      </S>

      <S h="4. Subscription and price">
        <p>Barcode scans are free. A subscription gives unlimited photo scans and more features. Prices include Norwegian VAT:</p>
        <ul style={ul}>
          <li>Okei Personal: NOK {kr(p.personal.month)} per month or NOK {kr(p.personal.year)} per year.</li>
          <li>Okei Family: NOK {kr(p.family.month)} per month or NOK {kr(p.family.year)} per year.</li>
        </ul>
        <p>The price is shown before you confirm. The subscription renews automatically for a new month or year until you cancel.</p>
      </S>

      <S h="5. Free trial">
        <p>New subscribers get {TRIAL_DAYS} days free. You add a card at the start but are not charged until the trial ends. If you cancel before the trial ends, you pay nothing. The trial is offered once per person.</p>
      </S>

      <S h="6. Payment">
        <ul style={ul}>
          <li>On erdetokei.no you pay by card through Stripe. Okei never sees your card number.</li>
          <li>If you buy in the iPhone or Android app, payment goes through the App Store or Google Play, and their purchase terms also apply.</li>
          <li>If a payment fails, we may retry. If it still fails, the subscription stops and you keep the free features.</li>
        </ul>
      </S>

      <S h="7. Cancellation">
        <p>You can cancel at any time. The subscription then runs to the end of the period you have paid for and does not renew. Started periods are not refunded, except under the right of withdrawal below.</p>
        <ul style={ul}>
          <li>Bought on erdetokei.no: cancel under Subscription with “Manage or cancel”, or email {EMAIL}.</li>
          <li>Bought in the app: cancel in your phone’s subscription settings (Apple ID or Google Play).</li>
        </ul>
      </S>

      <S h="8. Right of withdrawal">
        <p>You have a 14-day right of withdrawal under the Norwegian Right of Withdrawal Act from the day the agreement is made. Tell us by email within that time. If you asked for the service to start right away and have paid within the period, you get your money back minus a proportionate amount for the time you used the service. In-app purchases are withdrawn through the App Store or Google Play.</p>
      </S>

      <S h="9. Discount codes">
        <p>A discount code gives the discount and duration shown at purchase. Codes cannot be exchanged for money or combined with other codes.</p>
      </S>

      <S h="10. Changes to price and terms">
        <p>We will email you at least 30 days before a price increase or a significant change to these terms takes effect. If you do not want to continue, you can cancel before the change applies.</p>
      </S>

      <S h="11. Liability">
        <p>We do our best to keep Okei accurate and available, but we cannot guarantee that every answer is correct or that the service always works. To the extent the law allows, we are not liable for losses caused by errors in product data, in AI interpretation, or by not reading the label. Your statutory consumer rights always apply.</p>
      </S>

      <S h="12. Acceptable use">
        <p>You may not use Okei to harm others, try to get around its security, scrape data automatically, or resell the service. If you break these terms, we may close the account after a warning.</p>
      </S>

      <S h="13. Privacy">
        <p>How we handle your information is described in the <Link href="/personvern">privacy policy</Link>.</p>
      </S>

      <S h="14. Law and disputes">
        <p>Norwegian law applies. Please contact us first if you are unhappy. As a consumer you can also complain to the Norwegian Consumer Council (Forbrukerrådet), which can mediate, and the case can then be brought before the Consumer Disputes Commission (Forbrukerklageutvalget).</p>
      </S>
    </main>
  )
}
