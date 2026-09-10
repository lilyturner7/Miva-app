export default function AppHeader({ eyebrow }: { eyebrow?: string }) {
  return <header className="topbar appHeader">
    <div>{eyebrow ? <span className="eyebrow">{eyebrow}</span> : null}<h1 className="brand">Miva</h1></div>
    <a className="moreButton" href="/more" aria-label="Menu Miva">•••</a>
  </header>;
}
