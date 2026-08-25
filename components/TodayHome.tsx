'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

type MealRow = {
  id: string;
  meal_key: string;
  meal_label: string;
  planned_time: string | null;
  title: string | null;
  rationale: string | null;
};

type Plan = {
  id: string;
  name: string;
  plan_type: string;
  raw_extraction: {
    meals?: Array<{
      key: string;
      label: string;
      foods: Array<{ name: string; quantity?: number; unit?: string }>;
    }>;
  };
};

function localDateKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const timeKeyMap: Record<string, string> = {
  breakfast: 'breakfast_time',
  morning_snack: 'morning_snack_time',
  lunch: 'lunch_time',
  afternoon_snack: 'afternoon_snack_time',
  dinner: 'dinner_time',
  prebed: 'prebed_time',
  preworkout: 'preworkout_snack_time',
  postworkout: 'postworkout_snack_time',
};

const defaultTimes: Record<string, string> = {
  breakfast: '08:30',
  morning_snack: '10:30',
  lunch: '13:30',
  afternoon_snack: '16:30',
  dinner: '20:30',
  prebed: '22:30',
  preworkout: '17:30',
  postworkout: '19:00',
};

const mealIcons: Record<string, string> = {
  breakfast: '☕',
  morning_snack: '◌',
  lunch: '◉',
  afternoon_snack: '◌',
  dinner: '◉',
  prebed: '☾',
  preworkout: '↗',
  postworkout: '↘',
};

export default function TodayHome() {
  const supabase = useMemo(() => createClient(), []);
  const [loading, setLoading] = useState(true);
  const [firstName, setFirstName] = useState('');
  const [plan, setPlan] = useState<Plan | null>(null);
  const [meals, setMeals] = useState<MealRow[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        setLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name,onboarding_data,onboarding_completed_at')
        .eq('id', auth.user.id)
        .maybeSingle();

      setFirstName(profile?.first_name || profile?.onboarding_data?.first_name || '');
      const onboarding = profile?.onboarding_data ?? {};

      const { data: plans } = await supabase
        .from('nutrition_plans')
        .select('id,name,plan_type,raw_extraction')
        .eq('user_id', auth.user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: true });

      const typedPlans = (plans ?? []) as Plan[];
      const selected = typedPlans.find((p) => p.plan_type === 'standard')
        ?? typedPlans.find((p) => p.plan_type === 'off')
        ?? typedPlans[0]
        ?? null;
      setPlan(selected);

      if (!selected) {
        setMessage('Carica il tuo piano nutrizionale per creare la giornata reale.');
        setLoading(false);
        return;
      }

      const today = localDateKey();
      let { data: dailyPlan } = await supabase
        .from('daily_plans')
        .select('id')
        .eq('user_id', auth.user.id)
        .eq('plan_date', today)
        .maybeSingle();

      if (!dailyPlan) {
        const { data: created, error } = await supabase
          .from('daily_plans')
          .insert({
            user_id: auth.user.id,
            plan_date: today,
            nutrition_plan_id: selected.id,
            day_type: selected.plan_type,
            generation_context: { source: 'nutrition_plan', generated_at: new Date().toISOString() },
          })
          .select('id')
          .single();
        if (error) {
          setMessage(error.message);
          setLoading(false);
          return;
        }
        dailyPlan = created;
      }

      let { data: mealRows } = await supabase
        .from('daily_meals')
        .select('id,meal_key,meal_label,planned_time,title,rationale')
        .eq('daily_plan_id', dailyPlan.id)
        .order('planned_time', { ascending: true });

      if (!mealRows?.length) {
        const parsedMeals = selected.raw_extraction?.meals ?? [];
        const rows = parsedMeals.map((meal) => {
          const timeKey = timeKeyMap[meal.key];
          const plannedTime = timeKey && onboarding[timeKey]
            ? String(onboarding[timeKey])
            : defaultTimes[meal.key] ?? null;
          const foodNames = meal.foods.map((food) => food.name).filter(Boolean);
          return {
            user_id: auth.user.id,
            daily_plan_id: dailyPlan.id,
            meal_key: meal.key,
            meal_label: meal.label,
            planned_time: plannedTime,
            title: foodNames.slice(0, 4).join(', '),
            rationale: `Dal tuo ${selected.name}`,
          };
        });

        if (rows.length) {
          const { data: inserted, error } = await supabase
            .from('daily_meals')
            .insert(rows)
            .select('id,meal_key,meal_label,planned_time,title,rationale');
          if (!error) mealRows = inserted;
        }
      }

      setMeals((mealRows ?? []) as MealRow[]);
      setLoading(false);
    })();
  }, [supabase]);

  if (loading) {
    return <main className="shell"><section className="phone"><h1 className="brand">Miva</h1><div className="planMessage">Preparo la tua giornata…</div></section></main>;
  }

  return (
    <main className="shell">
      <section className="phone">
        <header className="topbar">
          <div>
            <span className="eyebrow">OGGI</span>
            <h1 className="brand">Miva</h1>
          </div>
          <a className="avatar" href="/onboarding" aria-label="Profilo">{firstName?.[0]?.toUpperCase() || 'M'}</a>
        </header>

        {!plan ? (
          <>
            <section className="heroCard">
              <span className="eyebrow">PARTIAMO DAL PIANO</span>
              <h2>{firstName ? `Ciao ${firstName}.` : 'Ciao.'} Miva è pronta.</h2>
              <p>{message}</p>
            </section>
            <a className="primaryAction" style={{display:'block',textAlign:'center',textDecoration:'none'}} href="/plans">Carica il piano nutrizionale</a>
          </>
        ) : (
          <>
            <section className="heroCard">
              <span className="eyebrow">{plan.plan_type.toUpperCase()} · {plan.name}</span>
              <h2>{firstName ? `Ciao ${firstName}, ecco la tua giornata.` : 'Ecco la tua giornata.'}</h2>
              <p>I pasti qui sotto vengono dal piano che hai caricato. Ora possiamo iniziare a renderli intelligenti con gusti, dispensa e programmi.</p>
            </section>

            {message ? <div className="planMessage">{message}</div> : null}

            <section className="timeline">
              {meals.map((meal) => (
                <a className="mealCard" style={{textDecoration:'none',color:'inherit'}} href={`/meal/${meal.id}`} key={meal.id}>
                  <span className="mealIcon">{mealIcons[meal.meal_key] ?? '○'}</span>
                  <span className="mealCopy">
                    <small>{meal.planned_time?.slice(0,5) ?? ''}</small>
                    <strong>{meal.meal_label}</strong>
                    <span>{meal.title || 'Apri per completare il pasto'}</span>
                    {meal.rationale ? <em>{meal.rationale}</em> : null}
                  </span>
                  <span className="chevron">›</span>
                </a>
              ))}
            </section>

            <nav className="bottomNav" aria-label="Navigazione principale">
              <a href="/" style={{textDecoration:'none',color:'var(--green)',fontSize:12}}>⌂<br/>Oggi</a>
              <a href="/plans" style={{textDecoration:'none',color:'var(--muted)',fontSize:12}}>▦<br/>Piano</a>
              <a href="/preferences" style={{textDecoration:'none',color:'var(--muted)',fontSize:12}}>♡<br/>Gusti</a>
              <a href="/pantry" style={{textDecoration:'none',color:'var(--muted)',fontSize:12}}>⌑<br/>Dispensa</a>
              <a href="/diary" style={{textDecoration:'none',color:'var(--muted)',fontSize:12}}>◌<br/>Diario</a>
            </nav>
          </>
        )}
      </section>
    </main>
  );
}
