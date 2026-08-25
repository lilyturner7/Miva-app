'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

type Rating = 'love' | 'like' | 'neutral' | 'avoid';
type FoodOption = { key: string; mealKey: string; mealLabel: string; name: string };

const ratingOptions: Array<{ value: Rating; label: string; symbol: string }> = [
  { value: 'love', label: 'Adoro', symbol: '♥' },
  { value: 'like', label: 'Mi piace', symbol: '●' },
  { value: 'neutral', label: 'Neutro', symbol: '○' },
  { value: 'avoid', label: 'Evita', symbol: '×' },
];

export default function TastePreferences() {
  const supabase = useMemo(() => createClient(), []);
  const [userId, setUserId] = useState<string | null>(null);
  const [foods, setFoods] = useState<FoodOption[]>([]);
  const [ratings, setRatings] = useState<Record<string, Rating>>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        setMessage('Accedi per impostare i tuoi gusti.');
        return;
      }
      setUserId(auth.user.id);

      const [{ data: plans }, { data: profile }] = await Promise.all([
        supabase.from('nutrition_plans').select('raw_extraction').eq('user_id', auth.user.id).eq('is_active', true),
        supabase.from('profiles').select('onboarding_data').eq('id', auth.user.id).maybeSingle(),
      ]);

      const map = new Map<string, FoodOption>();
      for (const plan of plans ?? []) {
        for (const meal of plan.raw_extraction?.meals ?? []) {
          for (const food of meal.foods ?? []) {
            const name = String(food.name ?? '').trim();
            if (!name) continue;
            const key = `${meal.key}:${name.toLowerCase()}`;
            if (!map.has(key)) map.set(key, { key, mealKey: meal.key, mealLabel: meal.label, name });
          }
        }
      }
      setFoods([...map.values()]);

      const existing = profile?.onboarding_data?.taste_preferences;
      if (existing && typeof existing === 'object') setRatings(existing as Record<string, Rating>);
    })();
  }, [supabase]);

  async function save() {
    if (!userId) return;
    setSaving(true);
    setMessage(null);

    const { data: profile } = await supabase.from('profiles').select('onboarding_data').eq('id', userId).maybeSingle();
    const onboardingData = profile?.onboarding_data && typeof profile.onboarding_data === 'object'
      ? profile.onboarding_data
      : {};

    const { error } = await supabase.from('profiles').update({
      onboarding_data: { ...onboardingData, taste_preferences: ratings },
    }).eq('id', userId);

    setSaving(false);
    setMessage(error ? error.message : 'Preferenze salvate. Miva userà questi gusti nelle proposte.');
  }

  const grouped = foods.reduce<Record<string, FoodOption[]>>((acc, food) => {
    const label = food.mealLabel || 'Altro';
    (acc[label] ||= []).push(food);
    return acc;
  }, {});

  return (
    <main className="tastePageShell">
      <section className="tastePage">
        <header className="planPageHeader">
          <a href="/plans" className="backLink">←</a>
          <h1 className="brand">Miva</h1>
          <span />
        </header>

        <div className="planIntro">
          <span className="eyebrow">I TUOI GUSTI</span>
          <h2>Cosa ti piace davvero?</h2>
          <p>Qui compaiono solo gli alimenti che Miva ha trovato nel tuo piano nutrizionale.</p>
        </div>

        {foods.length === 0 ? (
          <div className="planMessage">Prima carica e analizza almeno un piano nutrizionale.</div>
        ) : null}

        {Object.entries(grouped).map(([mealLabel, mealFoods]) => (
          <section className="tasteMealSection" key={mealLabel}>
            <h3>{mealLabel}</h3>
            {mealFoods.map((food) => (
              <article className="tasteFoodCard" key={food.key}>
                <strong>{food.name}</strong>
                <div className="tasteRatingGrid">
                  {ratingOptions.map((option) => (
                    <button
                      key={option.value}
                      className={ratings[food.key] === option.value ? `active ${option.value}` : ''}
                      onClick={() => setRatings((current) => ({ ...current, [food.key]: option.value }))}
                    >
                      <span>{option.symbol}</span>{option.label}
                    </button>
                  ))}
                </div>
              </article>
            ))}
          </section>
        ))}

        {foods.length ? (
          <button className="primaryAction tasteSave" disabled={saving} onClick={() => void save()}>
            {saving ? 'Salvo…' : 'Salva i miei gusti'}
          </button>
        ) : null}
        {message ? <div className="planMessage">{message}</div> : null}
      </section>
    </main>
  );
}
