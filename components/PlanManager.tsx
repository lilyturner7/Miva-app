'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

type PlanResult = {
  id: string;
  name: string;
  plan_type: string;
  parse_status: string;
  raw_extraction: {
    meals?: Array<{
      key: string;
      label: string;
      foods: Array<{ name: string; quantity?: number; unit?: string; raw: string }>;
    }>;
  };
};

export default function PlanManager() {
  const supabase = useMemo(() => createClient(), []);
  const [userId, setUserId] = useState<string | null>(null);
  const [plans, setPlans] = useState<PlanResult[]>([]);
  const [planType, setPlanType] = useState('standard');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function loadPlans(uid: string) {
    const { data } = await supabase
      .from('nutrition_plans')
      .select('id,name,plan_type,parse_status,raw_extraction')
      .eq('user_id', uid)
      .order('created_at', { ascending: false });
    setPlans((data ?? []) as PlanResult[]);
  }

  useEffect(() => {
    void (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        setMessage('Accedi a Miva per gestire il piano nutrizionale.');
        return;
      }
      setUserId(data.user.id);
      await loadPlans(data.user.id);
    })();
  }, [supabase]);

  async function handleFile(file: File) {
    if (!userId) return;
    setBusy(true);
    setMessage('Carico e analizzo il piano…');

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `${userId}/${Date.now()}-${safeName}`;
    const { error: uploadError } = await supabase.storage.from('nutrition-plans').upload(path, file);

    if (uploadError) {
      setBusy(false);
      setMessage(`Upload non riuscito: ${uploadError.message}`);
      return;
    }

    const response = await fetch('/api/plan/extract', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path,
        filename: file.name,
        planType,
        planName: planType === 'on' ? 'Piano ON' : planType === 'off' ? 'Piano OFF' : file.name.replace(/\.[^.]+$/, ''),
      }),
    });

    const result = await response.json();
    setBusy(false);

    if (!response.ok) {
      setMessage(result.error ?? 'Analisi non riuscita.');
      return;
    }

    setMessage(`Analisi completata: ${result.summary.mealsFound} pasti e ${result.summary.foodsFound} elementi riconosciuti.`);
    await loadPlans(userId);
  }

  return (
    <main className="planPageShell">
      <section className="planPage">
        <header className="planPageHeader">
          <a href="/" className="backLink">←</a>
          <h1 className="brand">Miva</h1>
          <span />
        </header>

        <div className="planIntro">
          <span className="eyebrow">PIANO NUTRIZIONALE</span>
          <h2>Facciamo leggere il piano a Miva.</h2>
          <p>Il documento viene salvato nel tuo spazio privato e trasformato in pasti, alimenti e grammature modificabili.</p>
        </div>

        <div className="planTypeTabs">
          {[
            ['standard', 'Standard'],
            ['on', 'ON'],
            ['off', 'OFF'],
          ].map(([value, label]) => (
            <button key={value} className={planType === value ? 'active' : ''} onClick={() => setPlanType(value)}>{label}</button>
          ))}
        </div>

        <label className={`planDrop ${busy ? 'busy' : ''}`}>
          <span className="planDropIcon">⌑</span>
          <strong>{busy ? 'Sto analizzando…' : 'Carica il piano'}</strong>
          <small>PDF, DOCX, XLS o XLSX</small>
          <input disabled={busy} type="file" accept=".pdf,.docx,.xls,.xlsx" onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void handleFile(file);
          }} />
        </label>

        {message ? <div className="planMessage">{message}</div> : null}

        <section className="parsedPlans">
          <h3>I tuoi piani</h3>
          {plans.length === 0 ? <p className="emptyText">Nessun piano analizzato per ora.</p> : null}
          {plans.map((plan) => (
            <article className="parsedPlanCard" key={plan.id}>
              <div className="parsedPlanTop">
                <div><strong>{plan.name}</strong><span>{plan.plan_type.toUpperCase()} · {plan.parse_status}</span></div>
                <b>{plan.raw_extraction?.meals?.length ?? 0} pasti</b>
              </div>
              <div className="mealExtractList">
                {(plan.raw_extraction?.meals ?? []).map((meal) => (
                  <div className="mealExtract" key={meal.key}>
                    <strong>{meal.label}</strong>
                    {meal.foods.length ? (
                      <ul>{meal.foods.slice(0, 8).map((food, index) => (
                        <li key={`${food.raw}-${index}`}>
                          <span>{food.name}</span>
                          {food.quantity ? <b>{food.quantity} {food.unit}</b> : null}
                        </li>
                      ))}</ul>
                    ) : <small>Nessun alimento riconosciuto automaticamente.</small>}
                  </div>
                ))}
              </div>
            </article>
          ))}
        </section>
      </section>
    </main>
  );
}
