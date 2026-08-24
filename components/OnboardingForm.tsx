'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

type Answers = Record<string, unknown>;

const initialAnswers: Answers = {
  language: 'it',
  goals: [],
  activity_level: '',
  dietary_style: '',
  plant_based_days_per_week: 0,
  allergies: [],
  intolerances: [],
  conditions: [],
  digestive_issues: [],
  preferred_cooking_methods: [],
  avoided_cooking_methods: [],
  show_calories: true,
  show_weight: true,
  neutral_language: false,
  avoid_compensation_language: false,
  food_relationship_preferences: [],
  snack_count: 2,
  habits_to_change: [],
  habit_reasons: [],
  intervention_style: 'gentle',
  cooking_time: '20',
  cooking_motivation: 'depends',
  kitchen_tools: [],
  planning_style: 'proposal_alternatives',
  planning_days: 5,
  display_days: 5,
  variety_style: 'balanced',
  max_repeat_count: 3,
  meal_prep_enabled: false,
  freeze_leftovers: false,
  does_sport: false,
  sports: [],
  on_sports: [],
  schedule_changes_often: true,
  pantry_enabled: false,
  supermarkets: [],
  notifications: ['medications'],
};

export default function OnboardingForm() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [answers, setAnswers] = useState<Answers>(initialAnswers);
  const [userId, setUserId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const { data, error: authError } = await supabase.auth.getUser();
      if (authError || !data.user) {
        router.replace('/login');
        return;
      }
      setUserId(data.user.id);

      const { data: profile } = await supabase
        .from('profiles')
        .select('onboarding_data,onboarding_completed_at')
        .eq('id', data.user.id)
        .maybeSingle();

      if (profile?.onboarding_completed_at) {
        router.replace('/');
        return;
      }
      if (profile?.onboarding_data && typeof profile.onboarding_data === 'object') {
        setAnswers((current) => ({ ...current, ...(profile.onboarding_data as Answers) }));
      }
    })();
  }, [router, supabase]);

  function setValue(key: string, value: unknown) {
    setAnswers((current) => ({ ...current, [key]: value }));
  }

  function toggleArray(key: string, value: string) {
    setAnswers((current) => {
      const values = Array.isArray(current[key]) ? (current[key] as string[]) : [];
      return {
        ...current,
        [key]: values.includes(value) ? values.filter((item) => item !== value) : [...values, value],
      };
    });
  }

  async function saveProgress(nextStep?: number) {
    if (!userId) return;
    setSaving(true);
    setError(null);
    const { error: saveError } = await supabase.from('profiles').upsert(
      {
        id: userId,
        onboarding_data: answers,
        language: String(answers.language ?? 'it'),
        activity_level: String(answers.activity_level ?? ''),
        dietary_style: String(answers.dietary_style ?? ''),
        plant_based_days_per_week: Number(answers.plant_based_days_per_week ?? 0),
        show_calories: Boolean(answers.show_calories),
        show_weight: Boolean(answers.show_weight),
        neutral_language: Boolean(answers.neutral_language),
        avoid_compensation_language: Boolean(answers.avoid_compensation_language),
        pantry_enabled: Boolean(answers.pantry_enabled),
      },
      { onConflict: 'id' },
    );
    setSaving(false);
    if (saveError) {
      setError(saveError.message);
      return;
    }
    if (nextStep) {
      setStep(nextStep);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  async function finish() {
    if (!userId) return;
    setSaving(true);
    setError(null);

    const { error: profileError } = await supabase.from('profiles').upsert(
      {
        id: userId,
        onboarding_data: answers,
        language: String(answers.language ?? 'it'),
        activity_level: String(answers.activity_level ?? ''),
        dietary_style: String(answers.dietary_style ?? ''),
        plant_based_days_per_week: Number(answers.plant_based_days_per_week ?? 0),
        show_calories: Boolean(answers.show_calories),
        show_weight: Boolean(answers.show_weight),
        neutral_language: Boolean(answers.neutral_language),
        avoid_compensation_language: Boolean(answers.avoid_compensation_language),
        pantry_enabled: Boolean(answers.pantry_enabled),
        onboarding_completed_at: new Date().toISOString(),
      },
      { onConflict: 'id' },
    );

    if (!profileError) {
      await supabase.from('user_settings').upsert(
        {
          user_id: userId,
          planning_days: Number(answers.planning_days ?? 5),
          display_days: Number(answers.display_days ?? 5),
          planning_style: String(answers.planning_style ?? 'proposal_alternatives'),
          variety_style: String(answers.variety_style ?? 'balanced'),
          max_repeat_count: Number(answers.max_repeat_count ?? 3),
          meal_prep_enabled: Boolean(answers.meal_prep_enabled),
          freeze_leftovers: Boolean(answers.freeze_leftovers),
          supermarkets: answers.supermarkets,
          notifications: toNotificationObject(answers.notifications),
        },
        { onConflict: 'user_id' },
      );
    }

    setSaving(false);
    if (profileError) {
      setError(profileError.message);
      return;
    }
    router.replace('/');
  }

  const props = { answers, setValue, toggleArray };

  return (
    <main className="onboardingShell">
      <section className="onboardingPhone">
        <div className="onboardingHeader">
          <h1 className="brand">Miva</h1>
          <div className="progressTrack"><span style={{ width: `${(step / 16) * 100}%` }} /></div>
          <p>{step} di 16</p>
        </div>

        {step === 1 && <AccountStep {...props} />}
        {step === 2 && <GoalsStep {...props} />}
        {step === 3 && <DietStep {...props} />}
        {step === 4 && <HealthStep {...props} />}
        {step === 5 && <DigestionStep {...props} />}
        {step === 6 && <VisibilityStep {...props} />}
        {step === 7 && <PlanStep {...props} />}
        {step === 8 && <TasteStep {...props} />}
        {step === 9 && <RoutineStep {...props} />}
        {step === 10 && <HabitsStep {...props} />}
        {step === 11 && <KitchenStep {...props} />}
        {step === 12 && <PlanningStep {...props} />}
        {step === 13 && <SportStep {...props} />}
        {step === 14 && <PantryStep {...props} />}
        {step === 15 && <NotificationsStep {...props} />}
        {step === 16 && <ReadyStep />}

        {error ? <p className="formError">{error}</p> : null}

        <div className="onboardingActions">
          {step > 1 ? <button className="secondaryAction" onClick={() => setStep(step - 1)}>Indietro</button> : null}
          {step < 16 ? (
            <button className="primaryAction" disabled={saving} onClick={() => void saveProgress(step + 1)}>
              {saving ? 'Salvo…' : 'Continua'}
            </button>
          ) : (
            <button className="primaryAction" disabled={saving} onClick={() => void finish()}>
              {saving ? 'Preparo Miva…' : 'Prepara i miei primi giorni'}
            </button>
          )}
        </div>
      </section>
    </main>
  );
}

function AccountStep({ answers, setValue }: StepProps) {
  return <Step title="Partiamo da te." subtitle="Questi dati costruiscono il tuo profilo Miva.">
    <Field label="Nome" value={answers.first_name} onChange={(v) => setValue('first_name', v)} />
    <Field label="Cognome" value={answers.last_name} onChange={(v) => setValue('last_name', v)} />
    <Field label="Nome utente" value={answers.username} onChange={(v) => setValue('username', v)} />
  </Step>;
}

function GoalsStep(p: StepProps) {
  return <Step title="Conosciamoci meglio." subtitle="Puoi selezionare più obiettivi.">
    <div className="twoCol"><Field label="Altezza cm" type="number" value={p.answers.height_cm} onChange={(v) => p.setValue('height_cm', v)} /><Field label="Peso kg" type="number" value={p.answers.weight_kg} onChange={(v) => p.setValue('weight_kg', v)} /></div>
    <Choice title="Stile di vita" options={['Sedentario','Moderatamente attivo','Molto attivo']} current={p.answers.activity_level} onPick={(v) => p.setValue('activity_level', v)} />
    <Multi title="Obiettivi" options={['Dimagrimento','Ricomposizione','Mantenimento','Performance']} values={p.answers.goals} onToggle={(v) => p.toggleArray('goals', v)} />
  </Step>;
}

function DietStep(p: StepProps) { return <Step title="Come preferisci mangiare?" subtitle="Miva userà questa preferenza solo tra le alternative compatibili col piano."><Choice title="Stile alimentare" options={['Onnivoro','Vegetariano','Vegano','Vegetariano/vegano alcuni giorni']} current={p.answers.dietary_style} onPick={(v) => p.setValue('dietary_style', v)} /><Choice title="Giorni vegetali a settimana" options={['0','1','2','3','4','5+']} current={String(p.answers.plant_based_days_per_week ?? 0)} onPick={(v) => p.setValue('plant_based_days_per_week', v === '5+' ? 5 : Number(v))} /></Step>; }
function HealthStep(p: StepProps) { return <Step title="Cosa deve tenere presente Miva?" subtitle="Seleziona ciò che è rilevante per te."><Multi title="Allergie" options={['Frutta a guscio','Uova','Pesce','Crostacei']} values={p.answers.allergies} onToggle={(v) => p.toggleArray('allergies', v)} /><Multi title="Intolleranze" options={['Lattosio','Glutine','Nichel']} values={p.answers.intolerances} onToggle={(v) => p.toggleArray('intolerances', v)} /><Multi title="Condizioni da considerare" options={['Colesterolo','Glicemia','Reflusso','Colon irritabile']} values={p.answers.conditions} onToggle={(v) => p.toggleArray('conditions', v)} /></Step>; }
function DigestionStep(p: StepProps) { return <Step title="Cosa ti fa stare meglio?" subtitle="Queste scelte influenzeranno le preparazioni proposte."><Multi title="Digestione" options={['Gonfiore','Reflusso','Digestione lenta','Stipsi','Diarrea']} values={p.answers.digestive_issues} onToggle={(v) => p.toggleArray('digestive_issues', v)} /><Multi title="Cotture preferite" options={['Forno','Vapore','Air fryer','Padella','Pentola a pressione','Bollitura']} values={p.answers.preferred_cooking_methods} onToggle={(v) => p.toggleArray('preferred_cooking_methods', v)} /></Step>; }
function VisibilityStep(p: StepProps) { return <Step title="Come vuoi vedere i tuoi dati?" subtitle="I macronutrienti rimarranno disponibili."><Choice title="Mostrare le calorie?" options={['Sì','No']} current={p.answers.show_calories ? 'Sì' : 'No'} onPick={(v) => p.setValue('show_calories', v === 'Sì')} /><Multi title="Preferenze di comunicazione" options={['Non mostrarmi il peso','Evita compensazioni','Evita parole come sgarro','Usa un tono neutro']} values={p.answers.food_relationship_preferences} onToggle={(v) => p.toggleArray('food_relationship_preferences', v)} /></Step>; }
function PlanStep(p: StepProps) { return <Step title="Carica il tuo piano nutrizionale." subtitle="L'upload reale del documento sarà collegato nel prossimo modulo."><div className="uploadPlaceholder"><strong>PDF · Word · Excel</strong><span>Qui Miva salverà il piano e ne estrarrà pasti, grammature ed equivalenze.</span></div><Choice title="Hai più tipi di giornata?" options={['Un solo piano','ON / OFF','Più di due']} current={p.answers.plan_structure} onPick={(v) => p.setValue('plan_structure', v)} /></Step>; }
function TasteStep(p: StepProps) { return <Step title="Cosa ti piace davvero?" subtitle="Dopo l'analisi del piano, qui compariranno solo gli alimenti presenti nel documento."><div className="tastePreview"><div><b>Colazione</b><span>💚 molto · 🟠 abbastanza · ⚪ evita</span></div><div><b>Spuntini</b><span>Le opzioni verranno estratte dal piano.</span></div><div><b>Pranzo</b><span>Le opzioni verranno estratte dal piano.</span></div><div><b>Cena</b><span>Le opzioni verranno estratte dal piano.</span></div></div></Step>; }
function RoutineStep(p: StepProps) { return <Step title="Come mangi di solito?" subtitle="Gli orari possono essere cambiati in qualsiasi momento."><div className="twoCol"><Field label="Colazione" type="time" value={p.answers.breakfast_time ?? '08:30'} onChange={(v) => p.setValue('breakfast_time', v)} /><Field label="Pranzo" type="time" value={p.answers.lunch_time ?? '13:30'} onChange={(v) => p.setValue('lunch_time', v)} /><Field label="Cena" type="time" value={p.answers.dinner_time ?? '20:30'} onChange={(v) => p.setValue('dinner_time', v)} /><Field label="Spuntino" type="time" value={p.answers.snack_time ?? '16:30'} onChange={(v) => p.setValue('snack_time', v)} /></div><Choice title="Quanti spuntini senti di aver bisogno?" options={['0','1','2','3+']} current={String(p.answers.snack_count)} onPick={(v) => p.setValue('snack_count', v === '3+' ? 3 : Number(v))} /></Step>; }
function HabitsStep(p: StepProps) { return <Step title="Su cosa vorresti lavorare?" subtitle="Miva non ti blocca: decide solo come e quando aiutarti."><Multi title="Abitudini" options={['Dolce dopo i pasti','Spilucco','Noia','Stress','Socialità','Cibo a portata di mano','Mangio mentre faccio altro','Mangio senza fame']} values={p.answers.habits_to_change} onToggle={(v) => p.toggleArray('habits_to_change', v)} /><Choice title="Come deve intervenire Miva?" options={['Gentilmente','Prima una strategia']} current={p.answers.intervention_style === 'strategy' ? 'Prima una strategia' : 'Gentilmente'} onPick={(v) => p.setValue('intervention_style', v === 'Prima una strategia' ? 'strategy' : 'gentle')} /></Step>; }
function KitchenStep(p: StepProps) { return <Step title="Quanto è realistico cucinare?" subtitle="Miva deve proporre piatti compatibili con la tua vita."><Choice title="Tempo abituale" options={['5','10','20','30','45+']} current={String(p.answers.cooking_time)} onPick={(v) => p.setValue('cooking_time', v)} /><Choice title="Voglia di cucinare" options={['Poca','Media','Alta','Dipende']} current={String(p.answers.cooking_motivation)} onPick={(v) => p.setValue('cooking_motivation', v)} /><Multi title="Strumenti" options={['Fornelli','Forno','Air fryer','Frullatore','Microonde','Pentola a pressione']} values={p.answers.kitchen_tools} onToggle={(v) => p.toggleArray('kitchen_tools', v)} /></Step>; }
function PlanningStep(p: StepProps) { return <Step title="Quanto vuoi che Miva organizzi?" subtitle="La proposta principale riduce le decisioni, ma resta sempre modificabile."><Choice title="Stile" options={['Organizza quasi tutto','Proposta + alternative','Decido io']} current={planningLabel(p.answers.planning_style)} onPick={(v) => p.setValue('planning_style', planningValue(v))} /><Choice title="Pianifica" options={['2 giorni','5 giorni','7 giorni']} current={`${p.answers.planning_days} giorni`} onPick={(v) => p.setValue('planning_days', Number(v.split(' ')[0]))} /><Multi title="Organizzazione" options={['Meal prep','Congelo avanzi']} values={[...(p.answers.meal_prep_enabled ? ['Meal prep'] : []), ...(p.answers.freeze_leftovers ? ['Congelo avanzi'] : [])]} onToggle={(v) => v === 'Meal prep' ? p.setValue('meal_prep_enabled', !p.answers.meal_prep_enabled) : p.setValue('freeze_leftovers', !p.answers.freeze_leftovers)} /></Step>; }
function SportStep(p: StepProps) { return <Step title="Come entra lo sport nella tua settimana?" subtitle="Miva userà gli allenamenti per scegliere la corretta giornata del piano."><Choice title="Fai sport?" options={['Sì','No']} current={p.answers.does_sport ? 'Sì' : 'No'} onPick={(v) => p.setValue('does_sport', v === 'Sì')} />{p.answers.does_sport ? <Multi title="Sport" options={['Palestra','Corsa','Camminata','Ciclismo','Nuoto','Tiro con l’arco','Tennis','Padel','Yoga','Pilates']} values={p.answers.sports} onToggle={(v) => p.toggleArray('sports', v)} /> : null}</Step>; }
function PantryStep(p: StepProps) { return <Step title="Vuoi usare Dispensa e Spesa intelligente?" subtitle="È facoltativa: Miva funziona anche senza inventario."><Choice title="Dispensa intelligente" options={['Sì','No']} current={p.answers.pantry_enabled ? 'Sì' : 'No'} onPick={(v) => p.setValue('pantry_enabled', v === 'Sì')} />{p.answers.pantry_enabled ? <Multi title="Supermercati abituali" options={['Lidl','Aldi','Eurospin','MD','Conad','Coop','Esselunga','Carrefour','Despar','Famila','Tosano']} values={p.answers.supermarkets} onToggle={(v) => p.toggleArray('supermarkets', v)} /> : null}</Step>; }
function NotificationsStep(p: StepProps) { return <Step title="Quali promemoria vuoi ricevere?" subtitle="Niente spam: puoi cambiare tutto dal Profilo."><Multi title="Notifiche" options={['Pillole','Scadenze','Spesa','Pianificazione']} values={p.answers.notifications} onToggle={(v) => p.toggleArray('notifications', v)} /></Step>; }
function ReadyStep() { return <Step title="Miva è pronta a conoscerti davvero." subtitle="Le risposte saranno salvate sul tuo account."><div className="readyCard"><span>✓ Profilo</span><span>✓ Preferenze</span><span>✓ Routine</span><span>✓ Pianificazione</span><span>✓ Sport e dispensa</span></div></Step>; }

function Step({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) { return <section className="questionStep"><span className="eyebrow">CONFIGURAZIONE</span><h2>{title}</h2><p>{subtitle}</p>{children}</section>; }
function Field({ label, value, onChange, type = 'text' }: { label: string; value: unknown; onChange: (value: string) => void; type?: string }) { return <label className="formField">{label}<input type={type} value={String(value ?? '')} onChange={(e) => onChange(e.target.value)} /></label>; }
function Choice({ title, options, current, onPick }: { title: string; options: string[]; current: unknown; onPick: (value: string) => void }) { return <div className="questionBlock"><b>{title}</b><div className="choiceGrid">{options.map((option) => <button key={option} type="button" className={String(current) === option ? 'option active' : 'option'} onClick={() => onPick(option)}>{option}</button>)}</div></div>; }
function Multi({ title, options, values, onToggle }: { title: string; options: string[]; values: unknown; onToggle: (value: string) => void }) { const selected = Array.isArray(values) ? values as string[] : []; return <div className="questionBlock"><b>{title}</b><div className="choiceGrid">{options.map((option) => <button key={option} type="button" className={selected.includes(option) ? 'option active' : 'option'} onClick={() => onToggle(option)}>{option}</button>)}</div></div>; }

type StepProps = { answers: Answers; setValue: (key: string, value: unknown) => void; toggleArray: (key: string, value: string) => void };
function planningLabel(value: unknown) { return value === 'auto' ? 'Organizza quasi tutto' : value === 'manual' ? 'Decido io' : 'Proposta + alternative'; }
function planningValue(label: string) { return label === 'Organizza quasi tutto' ? 'auto' : label === 'Decido io' ? 'manual' : 'proposal_alternatives'; }
function toNotificationObject(value: unknown) { const items = Array.isArray(value) ? value as string[] : []; return { medications: items.includes('Pillole') || items.includes('medications'), expirations: items.includes('Scadenze'), shopping: items.includes('Spesa'), planning: items.includes('Pianificazione') }; }
