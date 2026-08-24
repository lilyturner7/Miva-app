import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="shell">
      <section className="phone">
        <header className="topbar">
          <div>
            <span className="eyebrow">Lunedì</span>
            <h1 className="brand">Miva</h1>
          </div>
          <Link className="avatar" href="/login" aria-label="Accedi o apri profilo">M</Link>
        </header>

        <section className="heroCard">
          <span className="eyebrow">OGGI · PIANO OFF</span>
          <h2>Il tuo piano di oggi è pronto.</h2>
          <p>Miva userà piano, gusti, routine, sport e dispensa per proporti la scelta più sensata.</p>
        </section>

        <section className="macroGrid" aria-label="Macronutrienti">
          <article><strong>190 g</strong><span>Carboidrati</span></article>
          <article><strong>95 g</strong><span>Proteine</span></article>
          <article><strong>60 g</strong><span>Grassi</span></article>
        </section>

        <section className="timeline">
          <Meal time="08:30" icon="☕" title="Colazione" food="Yogurt, granola e frutta" />
          <Divider label="＋ Inserisci pillola" />
          <Meal time="10:30" icon="🍎" title="Spuntino mattina" food="Frutta + yogurt" />
          <Meal time="13:30" icon="🥗" title="Pranzo" food="Tonno, ceci, pomodorini e pane" note="Usiamo i ceci: sono già aperti." />
          <Meal time="16:30" icon="🥜" title="Spuntino pomeriggio" food="Frutta + frutta secca" />
          <Meal time="20:30" icon="🍗" title="Cena" food="Pollo, zucchine e pane" />
          <Meal time="22:30" icon="🌙" title="Pre-nanna" food="Yogurt" />
        </section>

        <nav className="bottomNav" aria-label="Navigazione principale">
          <button className="active">⌂<span>Oggi</span></button>
          <button>▦<span>Piano</span></button>
          <button>⌑<span>Dispensa</span></button>
          <button>🛍<span>Spesa</span></button>
          <button>♡<span>Diario</span></button>
        </nav>
      </section>
    </main>
  );
}

function Meal({ time, icon, title, food, note }: { time: string; icon: string; title: string; food: string; note?: string }) {
  return (
    <button className="mealCard">
      <span className="mealIcon">{icon}</span>
      <span className="mealCopy">
        <small>{time}</small>
        <strong>{title}</strong>
        <span>{food}</span>
        {note ? <em>{note}</em> : null}
      </span>
      <span className="chevron">›</span>
    </button>
  );
}

function Divider({ label }: { label: string }) {
  return <button className="dividerAction">{label}</button>;
}
