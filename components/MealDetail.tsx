'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

type Item = {
  id?: string;
  food_name: string;
  planned_quantity: number | null;
  actual_quantity: number | null;
  unit: string | null;
  source: string;
};

type Meal = {
  id: string;
  meal_key: string;
  meal_label: string;
  planned_time: string | null;
  title: string | null;
  status: string;
  daily_plan_id: string;
};

export default function MealDetail({ mealId }: { mealId: string }) {
  const supabase = useMemo(() => createClient(), []);
  const [meal, setMeal] = useState<Meal | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        setMessage('Accedi per aprire il pasto.');
        setBusy(false);
        return;
      }
      setUserId(auth.user.id);

      const { data: mealData, error } = await supabase
        .from('daily_meals')
        .select('id,meal_key,meal_label,planned_time,title,status,daily_plan_id')
        .eq('id', mealId)
        .maybeSingle();

      if (error || !mealData) {
        setMessage(error?.message ?? 'Pasto non trovato.');
        setBusy(false);
        return;
      }
      setMeal(mealData as Meal);

      const { data: existing } = await supabase
        .from('meal_items')
        .select('id,food_name,planned_quantity,actual_quantity,unit,source')
        .eq('daily_meal_id', mealId)
        .order('created_at');

      if (existing?.length) {
        setItems(existing as Item[]);
        setBusy(false);
        return;
      }

      const { data: dailyPlan } = await supabase
        .from('daily_plans')
        .select('nutrition_plan_id')
        .eq('id', mealData.daily_plan_id)
        .maybeSingle();

      if (dailyPlan?.nutrition_plan_id) {
        const { data: plan } = await supabase
          .from('nutrition_plans')
          .select('raw_extraction')
          .eq('id', dailyPlan.nutrition_plan_id)
          .maybeSingle();
        const parsedMeal = plan?.raw_extraction?.meals?.find((entry: any) => entry.key === mealData.meal_key);
        const fromPlan: Item[] = (parsedMeal?.foods ?? []).map((food: any) => ({
          food_name: food.name,
          planned_quantity: typeof food.quantity === 'number' ? food.quantity : null,
          actual_quantity: typeof food.quantity === 'number' ? food.quantity : null,
          unit: food.unit ?? 'g',
          source: 'plan',
        }));
        setItems(fromPlan);
      }
      setBusy(false);
    })();
  }, [mealId, supabase]);

  function updateItem(index: number, patch: Partial<Item>) {
    setItems((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item));
  }

  function addItem() {
    setItems((current) => [...current, {
      food_name: '',
      planned_quantity: null,
      actual_quantity: null,
      unit: 'g',
      source: 'manual',
    }]);
  }

  async function saveMeal() {
    if (!userId || !meal) return;
    setBusy(true);
    setMessage(null);

    const validItems = items.filter((item) => item.food_name.trim());
    const { error: deleteError } = await supabase.from('meal_items').delete().eq('daily_meal_id', meal.id);
    if (deleteError) {
      setBusy(false);
      setMessage(deleteError.message);
      return;
    }

    if (validItems.length) {
      const { error: insertError } = await supabase.from('meal_items').insert(validItems.map((item) => ({
        user_id: userId,
        daily_meal_id: meal.id,
        food_name: item.food_name.trim(),
        planned_quantity: item.planned_quantity,
        actual_quantity: item.actual_quantity,
        unit: item.unit || 'g',
        source: item.source || 'manual',
      })));
      if (insertError) {
        setBusy(false);
        setMessage(insertError.message);
        return;
      }
    }

    const { error: mealError } = await supabase.from('daily_meals').update({ status: 'eaten' }).eq('id', meal.id);
    setBusy(false);
    setMessage(mealError ? mealError.message : 'Pasto registrato. Le grammature effettive sono state salvate.');
  }

  if (busy && !meal) return <main className="mealDetailShell"><section className="mealDetail"><div className="planMessage">Apro il pasto…</div></section></main>;

  return (
    <main className="mealDetailShell">
      <section className="mealDetail">
        <header className="planPageHeader">
          <a href="/" className="backLink">←</a>
          <h1 className="brand">Miva</h1>
          <span />
        </header>

        {meal ? (
          <>
            <div className="planIntro">
              <span className="eyebrow">{meal.planned_time?.slice(0,5) ?? ''}</span>
              <h2>{meal.meal_label}</h2>
              <p>Controlla cosa hai mangiato davvero. Le quantità effettive possono essere diverse da quelle pianificate.</p>
            </div>

            <div className="mealItemEditor">
              {items.map((item, index) => (
                <article className="mealItemRow" key={`${item.food_name}-${index}`}>
                  <input className="foodNameInput" value={item.food_name} placeholder="Alimento" onChange={(e) => updateItem(index, { food_name: e.target.value })} />
                  <div className="quantityCompare">
                    <label><span>Piano</span><input type="number" inputMode="decimal" value={item.planned_quantity ?? ''} onChange={(e) => updateItem(index, { planned_quantity: e.target.value === '' ? null : Number(e.target.value) })} /></label>
                    <span className="quantityArrow">→</span>
                    <label><span>Mangiato</span><input type="number" inputMode="decimal" value={item.actual_quantity ?? ''} onChange={(e) => updateItem(index, { actual_quantity: e.target.value === '' ? null : Number(e.target.value) })} /></label>
                    <select value={item.unit ?? 'g'} onChange={(e) => updateItem(index, { unit: e.target.value })}>
                      <option value="g">g</option><option value="ml">ml</option><option value="pz">pz</option><option value="fette">fette</option>
                    </select>
                  </div>
                </article>
              ))}
            </div>

            <button className="secondaryAction addMealItem" onClick={addItem}>＋ Ho mangiato anche altro</button>
            <button className="primaryAction saveMealButton" disabled={busy} onClick={() => void saveMeal()}>{busy ? 'Salvo…' : 'Conferma cosa ho mangiato'}</button>
            {message ? <div className="planMessage">{message}</div> : null}
          </>
        ) : <div className="planMessage">{message ?? 'Pasto non trovato.'}</div>}
      </section>
    </main>
  );
}
