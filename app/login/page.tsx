import AuthForm from '@/components/AuthForm';

export default function LoginPage() {
  return (
    <main className="authShell">
      <section className="authPhone">
        <div className="authBrandWrap">
          <div className="authLogoMark" aria-hidden="true">🌿</div>
          <h1 className="brand">Miva</h1>
          <p>Il tuo piano, nella vita reale.</p>
        </div>
        <AuthForm />
      </section>
    </main>
  );
}
