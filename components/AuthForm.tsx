'use client';

import { FormEvent, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function AuthForm() {
  const supabase = useMemo(() => createClient(), []);
  const [mode, setMode] = useState<'login' | 'signup'>('signup');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              first_name: firstName,
              last_name: lastName,
            },
          },
        });

        if (error) throw error;
        setMessage('Account creato. Se richiesto, controlla la tua email per confermare la registrazione.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        window.location.href = '/';
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Si è verificato un errore.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="authCard">
      <div className="authTabs" role="tablist" aria-label="Accesso Miva">
        <button
          type="button"
          className={mode === 'signup' ? 'active' : ''}
          onClick={() => setMode('signup')}
        >
          Crea account
        </button>
        <button
          type="button"
          className={mode === 'login' ? 'active' : ''}
          onClick={() => setMode('login')}
        >
          Accedi
        </button>
      </div>

      <form onSubmit={submit} className="authForm">
        {mode === 'signup' ? (
          <div className="authNameGrid">
            <label>
              Nome
              <input value={firstName} onChange={(e) => setFirstName(e.target.value)} autoComplete="given-name" required />
            </label>
            <label>
              Cognome
              <input value={lastName} onChange={(e) => setLastName(e.target.value)} autoComplete="family-name" required />
            </label>
          </div>
        ) : null}

        <label>
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
        </label>

        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            minLength={8}
            required
          />
        </label>

        <button className="primaryAction" type="submit" disabled={loading}>
          {loading ? 'Attendi…' : mode === 'signup' ? 'Crea il mio account Miva' : 'Accedi a Miva'}
        </button>
      </form>

      {message ? <p className="authMessage" role="status">{message}</p> : null}

      <p className="authFinePrint">
        Miva utilizza il tuo account per salvare piano, preferenze e progressi in modo sicuro.
      </p>
    </section>
  );
}
