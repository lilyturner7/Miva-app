'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

type Answers = Record<string, any>;
type Props = {
  answers: Answers;
  setValue: (key: string, value: any) => void;
  toggleArray: (key: string, value: string) => void;
};

const initialAnswers: Answers = {
  language: 'it',
  goals: [],
  activity_level: '',
  dietary_modes: [],
  vegetarian_days: 0,
  vegan_days: 0,
  allergies: [],
  intolerances: [],
  conditions: [],
  preferred_cooking_methods: [],
  avoided_cooking_methods: [],
  show_calories: true,
  show_weight: true,
  avoid_compensation_language: false,
  avoid_judgmental_language: true,
  neutral_language: true,
  snack_count: 0,
  snack_locations: [],
  habits_to_change: [],
  intervention_style_label: 'Ricordamelo gentilmente e lasciami decidere',
  cooking_motivation: 'Dipende dal giorno',
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
  plan_structure: 'single',
  plan_count: 1,
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
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
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
      if (profile?.onboarding_data) {
        setAnswers((current) => ({ ...current, ...profile.onboarding_data }));
      }
    })();
  }, [router, supabase]);

  function setValue(key: string, value: any) {
    setAnswers((current) => ({ ...current, [key]: value }));
  }

  function toggleArray(key: string, value: string) {
    setAnswers((current) => {
      const list = Array.isArray(current[key]) ? current[key] : [];
      return {
        ...current,
        [key]: list.includes(value) ? list.filter((item: string) => item !== value) : [...list, value],
      };
    });
  }

  async function saveProgress(next?: number) {
    if (!userId) return;
    setSaving(true);
    setError(null);

    const { error: saveError } = await supabase.from('profiles').upsert(
      {
        id: userId,
        onboarding_data: answers,
        language: String(answers.language || 'it'),
        activity_level: String(answers.activity_level || ''),
        dietary_style: (answers.dietary_modes || []).join(','),
        plant_based_days_per_week: Math.min(
          7,
          Number(answers.vegetarian_days || 0) + Number(answers.vegan_days || 0),
        ),
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
    if (next) {
      setStep(next);
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
        onboarding_completed_at: new Date().toISOString(),
        language: String(answers.language || 'it'),
        activity_level: String(answers.activity_level || ''),
        dietary_style: (answers.dietary_modes || []).join(','),
        plant_based_days_per_week: Math.min(
          7,
          Number(answers.vegetarian_days || 0) + Number(answers.vegan_days || 0),
        ),
        show_calories: Boolean(answers.show_calories),
        show_weight: Boolean(answers.show_weight),
        neutral_language: Boolean(answers.neutral_language),
        avoid_compensation_language: Boolean(answers.avoid_compensation_language),
        pantry_enabled: Boolean(answers.pantry_enabled),
      },
      { onConflict: 'id' },
    );

    if (!profileError) {
      await supabase.from('user_settings').upsert(
        {
          user_id: userId,
          planning_days: Number(answers.planning_days || 5),
          display_days: Number(answers.display_days || 5),
          planning_style: answers.planning_style,
          variety_style: answers.variety_style,
          max_repeat_count: Number(answers.max_repeat_count || 3),
          meal_prep_enabled: Boolean(answers.meal_prep_enabled),
          freeze_leftovers: Boolean(answers.freeze_leftovers),
          supermarkets: answers.supermarkets || [],
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
        {step === 3 && <FoodStyleStep {...props} />}
        {step === 4 && <HealthStep {...props} />}
        {step === 5 && <CookingMethodsStep {...props} />}
        {step === 6 && <CommunicationStep {...props} />}
        {step === 7 && <PlansStep {...props} userId={userId} supabase={supabase} />}
        {step === 8 && <TasteStep />}
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

function AccountStep(p: Props) {
  return <Step title="Partiamo da te." subtitle="Questi dati costruiscono il tuo profilo Miva.">
    <Field label="Nome" value={p.answers.first_name} onChange={(v) => p.setValue('first_name', v)} />
    <Field label="Cognome" value={p.answers.last_name} onChange={(v) => p.setValue('last_name', v)} />
    <Field label="Nome utente" value={p.answers.username} onChange={(v) => p.setValue('username', v)} />
    <Field label="Data di nascita" type="date" value={p.answers.birth_date} onChange={(v) => p.setValue('birth_date', v)} />
  </Step>;
}

function GoalsStep(p: Props) {
  return <Step title="Conosciamoci meglio." subtitle="Puoi selezionare più obiettivi.">
    <div className="twoCol">
      <Field label="Altezza cm" type="number" value={p.answers.height_cm} onChange={(v) => p.setValue('height_cm', v)} />
      <Field label="Peso kg" type="number" value={p.answers.weight_kg} onChange={(v) => p.setValue('weight_kg', v)} />
    </div>
    <Choice title="Stile di vita" options={['Sedentario', 'Moderatamente attivo', 'Molto attivo']} current={p.answers.activity_level} onPick={(v) => p.setValue('activity_level', v)} />
    <Multi title="Obiettivi" options={['Dimagrimento', 'Ricomposizione', 'Mantenimento', 'Performance']} values={p.answers.goals} onToggle={(v) => p.toggleArray('goals', v)} />
  </Step>;
}

function FoodStyleStep(p: Props) {
  const modes = p.answers.dietary_modes || [];
  return <Step title="Come preferisci mangiare?" subtitle="Puoi combinare più preferenze.">
    <Multi title="Stile alimentare" options={['Onnivoro', 'Vegetariano alcuni giorni', 'Vegano alcuni giorni']} values={modes} onToggle={(v) => p.toggleArray('dietary_modes', v)} />
    {modes.includes('Vegetariano alcuni giorni') ? <Choice title="Quanti giorni vegetariani a settimana?" options={['1','2','3','4','5','6','7']} current={String(p.answers.vegetarian_days || '')} onPick={(v) => p.setValue('vegetarian_days', Number(v))} /> : null}
    {modes.includes('Vegano alcuni giorni') ? <Choice title="Quanti giorni vegani a settimana?" options={['1','2','3','4','5','6','7']} current={String(p.answers.vegan_days || '')} onPick={(v) => p.setValue('vegan_days', Number(v))} /> : null}
    <p className="hint">Se scegli entrambe, Miva terrà conto delle due frequenze senza sovrapporle automaticamente.</p>
  </Step>;
}

function HealthStep(p: Props) {
  return <Step title="Cosa deve tenere presente Miva?" subtitle="Seleziona oppure scrivi: mentre digiti, Miva ti proporrà elementi riconosciuti.">
    <MultiWithText title="Allergie" options={['Frutta a guscio','Uova','Pesce','Crostacei','Arachidi','Soia']} values={p.answers.allergies} onToggle={(v) => p.toggleArray('allergies', v)} placeholder="Scrivi un alimento o allergene…" />
    <MultiWithText title="Intolleranze" options={['Lattosio','Glutine','Nichel','Fruttosio']} values={p.answers.intolerances} onToggle={(v) => p.toggleArray('intolerances', v)} placeholder="Scrivi un'intolleranza…" />
    <MultiWithText title="Patologie o condizioni da considerare" options={['Colesterolo','Glicemia','Reflusso','Colon irritabile']} values={p.answers.conditions} onToggle={(v) => p.toggleArray('conditions', v)} placeholder="Scrivi una condizione…" />
  </Step>;
}

function CookingMethodsStep(p: Props) {
  return <Step title="Metodi di cottura" subtitle="Quali prediligi e quali preferisci evitare?">
    <MultiWithText title="Metodi che prediligi" options={['Forno','Vapore','Air fryer','Padella','Pentola a pressione','Bollitura','Griglia']} values={p.answers.preferred_cooking_methods} onToggle={(v) => p.toggleArray('preferred_cooking_methods', v)} placeholder="Aggiungi un metodo…" />
    <MultiWithText title="Metodi da evitare" options={['Frittura','Griglia','Forno','Bollitura']} values={p.answers.avoided_cooking_methods} onToggle={(v) => p.toggleArray('avoided_cooking_methods', v)} placeholder="Aggiungi un metodo da evitare…" />
  </Step>;
}

function CommunicationStep(p: Props) {
  return <Step title="Come vuoi che Miva comunichi con te?" subtitle="Puoi cambiare queste impostazioni in qualsiasi momento.">
    <Switch label="Mostra calorie" value={Boolean(p.answers.show_calories)} onChange={(v) => p.setValue('show_calories', v)} />
    <Switch label="Mostra peso" value={Boolean(p.answers.show_weight)} onChange={(v) => p.setValue('show_weight', v)} />
    <Switch label="Usa un tono neutro" value={Boolean(p.answers.neutral_language)} onChange={(v) => p.setValue('neutral_language', v)} />
    <Switch label="Evita messaggi di compensazione" value={Boolean(p.answers.avoid_compensation_language)} onChange={(v) => p.setValue('avoid_compensation_language', v)} />
    <Switch label="Evita parole come “sgarro” o “cibo cattivo”" value={Boolean(p.answers.avoid_judgmental_language)} onChange={(v) => p.setValue('avoid_judgmental_language', v)} />
  </Step>;
}

function PlansStep({ answers, setValue, userId, supabase }: Props & { userId: string | null; supabase: any }) {
  const structure = answers.plan_structure || 'single';
  const count = structure === 'single' ? 1 : structure === 'onoff' ? 2 : Number(answers.plan_count || 3);

  async function upload(file: File, index: number) {
    if (!userId) return;
    const path = `${userId}/${Date.now()}-${index}-${file.name}`;
    const { error } = await supabase.storage.from('nutrition-plans').upload(path, file);
    if (error) {
      alert(`Upload non disponibile: ${error.message}`);
      return;
    }
    const files = [...(answers.plan_files || [])];
    files[index] = { name: file.name, path };
    setValue('plan_files', files);
  }

  return <Step title="Carica il tuo piano nutrizionale." subtitle="Puoi inserire uno o più PDF, Word o Excel. Ogni piano resta separato.">
    <Choice title="Quanti tipi di giornata hai?" options={['Un solo piano','ON / OFF','Più di due']} current={structure === 'single' ? 'Un solo piano' : structure === 'onoff' ? 'ON / OFF' : 'Più di due'} onPick={(v) => {
      setValue('plan_structure', v === 'Un solo piano' ? 'single' : v === 'ON / OFF' ? 'onoff' : 'multiple');
      if (v === 'Più di due' && !answers.plan_count) setValue('plan_count', 3);
    }} />
    {structure === 'multiple' ? <div className="inlineCounter">
      <button type="button" onClick={() => setValue('plan_count', Math.max(3, count - 1))}>−</button>
      <span>{count} piani</span>
      <button type="button" onClick={() => setValue('plan_count', count + 1)}>＋</button>
    </div> : null}
    <div className="planUploadGrid">
      {Array.from({ length: count }, (_, index) => <label className="realUpload" key={index}>
        <b>{structure === 'onoff' ? (index === 0 ? 'Piano ON' : 'Piano OFF') : `Piano ${index + 1}`}</b>
        <span>{answers.plan_files?.[index]?.name || 'Tocca per scegliere PDF, Word o Excel'}</span>
        <input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx" onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void upload(file, index);
        }} />
      </label>)}
    </div>
  </Step>;
}

function TasteStep() {
  return <Step title="Cosa ti piace davvero?" subtitle="Dopo l'analisi del piano, Miva dividerà gli alimenti per pasto.">
    <div className="tastePreview">
      {['Colazione','Spuntini','Pranzo','Cena'].map((label) => <div key={label}><b>{label}</b><span>💚 molto · 🟠 abbastanza · ⚪ evita</span></div>)}
    </div>
  </Step>;
}

function RoutineStep(p: Props) {
  const snackCount = Number(p.answers.snack_count || 0);
  const locations: string[] = Array.isArray(p.answers.snack_locations) ? p.answers.snack_locations : [];
  const locationOptions = [
    'Mattina',
    'Pomeriggio',
    'Pre-nanna',
    'Pre-workout',
    'Post-workout',
  ];

  function toggleLocation(value: string) {
    if (locations.includes(value)) {
      p.setValue('snack_locations', locations.filter((item) => item !== value));
      return;
    }
    if (snackCount > 0 && snackCount < 3 && locations.length >= snackCount) return;
    p.setValue('snack_locations', [...locations, value]);
  }

  function setSnackCount(value: string) {
    const count = value === '3+' ? 3 : Number(value);
    p.setValue('snack_count', count);
    if (count === 0) p.setValue('snack_locations', []);
    if (count > 0 && count < 3 && locations.length > count) {
      p.setValue('snack_locations', locations.slice(0, count));
    }
  }

  return <Step title="Quando mangi di solito?" subtitle="Prima definiamo i pasti principali, poi collochiamo solo gli spuntini che fai davvero.">
    <div className="mealTimes">
      <Field label="Colazione" type="time" value={p.answers.breakfast_time || '08:30'} onChange={(v) => p.setValue('breakfast_time', v)} />
      <Field label="Pranzo" type="time" value={p.answers.lunch_time || '13:30'} onChange={(v) => p.setValue('lunch_time', v)} />
      <Field label="Cena" type="time" value={p.answers.dinner_time || '20:30'} onChange={(v) => p.setValue('dinner_time', v)} />
    </div>

    <Choice title="Quanti spuntini senti di aver bisogno durante la giornata?" options={['0','1','2','3+']} current={snackCount >= 3 ? '3+' : String(snackCount)} onPick={setSnackCount} />

    {snackCount > 0 ? <div className="questionBlock">
      <b>Dove vuoi collocarli?</b>
      <p className="hint">{snackCount < 3 ? `Seleziona ${snackCount} ${snackCount === 1 ? 'momento' : 'momenti'}.` : 'Seleziona tutti i momenti che possono servirti.'}</p>
      <div className="choiceGrid">
        {locationOptions.map((option) => <button
          key={option}
          type="button"
          className={`option ${locations.includes(option) ? 'active' : ''}`}
          onClick={() => toggleLocation(option)}
        >{option}</button>)}
      </div>
    </div> : null}

    {locations.length > 0 ? <div className="mealTimes">
      {locations.includes('Mattina') ? <Field label="Orario spuntino mattina" type="time" value={p.answers.morning_snack_time || '10:30'} onChange={(v) => p.setValue('morning_snack_time', v)} /> : null}
      {locations.includes('Pomeriggio') ? <Field label="Orario spuntino pomeriggio" type="time" value={p.answers.afternoon_snack_time || '16:30'} onChange={(v) => p.setValue('afternoon_snack_time', v)} /> : null}
      {locations.includes('Pre-nanna') ? <Field label="Orario pre-nanna" type="time" value={p.answers.prebed_time || '22:30'} onChange={(v) => p.setValue('prebed_time', v)} /> : null}
      {locations.includes('Pre-workout') ? <Field label="Orario abituale pre-workout" type="time" value={p.answers.preworkout_snack_time || '17:30'} onChange={(v) => p.setValue('preworkout_snack_time', v)} /> : null}
      {locations.includes('Post-workout') ? <Field label="Orario abituale post-workout" type="time" value={p.answers.postworkout_snack_time || '19:00'} onChange={(v) => p.setValue('postworkout_snack_time', v)} /> : null}
    </div> : null}
  </Step>;
}

function HabitsStep(p: Props) {
  return <Step title="Su cosa vorresti lavorare?" subtitle="Miva adatta il livello di intervento che preferisci.">
    <Multi title="Abitudini" options={['Dolce dopo i pasti','Spilucco','Noia','Stress','Socialità','Cibo a portata di mano','Mangio mentre faccio altro','Mangio senza fame']} values={p.answers.habits_to_change} onToggle={(v) => p.toggleArray('habits_to_change', v)} />
    <Choice title="Come vuoi che agisca Miva?" options={['Solo registrare, senza intervenire','Ricordamelo gentilmente e lasciami decidere','Fammi una domanda prima di suggerire','Proponimi una strategia alternativa','Intervieni solo se il comportamento si ripete']} current={p.answers.intervention_style_label} onPick={(v) => p.setValue('intervention_style_label', v)} />
  </Step>;
}

function KitchenStep(p: Props) {
  return <Step title="Quanta voglia hai di cucinare di solito?" subtitle="Serve a evitare ricette troppo impegnative nei giorni sbagliati.">
    <Choice title="Voglia di cucinare" options={['Poca','Media','Alta','Dipende dal giorno']} current={p.answers.cooking_motivation} onPick={(v) => p.setValue('cooking_motivation', v)} />
    <Multi title="Cosa hai a disposizione?" options={['Fornelli','Forno','Air fryer','Microonde','Frullatore','Frullatore a immersione','Pentola a pressione']} values={p.answers.kitchen_tools} onToggle={(v) => p.toggleArray('kitchen_tools', v)} />
  </Step>;
}

function PlanningStep(p: Props) {
  return <Step title="Quanto vuoi che Miva organizzi?" subtitle="Puoi cambiare questo livello anche più avanti.">
    <Choice title="Modalità" options={['Organizza quasi tutto','Proposta + alternative','Preferisco decidere io']} current={p.answers.planning_style_label} onPick={(v) => {
      p.setValue('planning_style_label', v);
      p.setValue('planning_style', v === 'Organizza quasi tutto' ? 'automatic' : v === 'Preferisco decidere io' ? 'manual' : 'proposal_alternatives');
    }} />
    <Choice title="Quanti giorni pianificare?" options={['2','5','7']} current={String(p.answers.planning_days)} onPick={(v) => p.setValue('planning_days', Number(v))} />
    <Choice title="Quanti giorni vuoi vedere?" options={['2','5','7']} current={String(p.answers.display_days)} onPick={(v) => p.setValue('display_days', Number(v))} />
    <Choice title="Varietà" options={['Routine','Routine + varietà','Molta varietà']} current={p.answers.variety_style_label} onPick={(v) => {
      p.setValue('variety_style_label', v);
      p.setValue('variety_style', v === 'Routine' ? 'routine' : v === 'Molta varietà' ? 'varied' : 'balanced');
    }} />
    <Choice title="Quante volte può ripetersi lo stesso pranzo/cena?" options={['1','2','3','Indifferente']} current={String(p.answers.max_repeat_count)} onPick={(v) => p.setValue('max_repeat_count', v === 'Indifferente' ? 7 : Number(v))} />
    <Switch label="Sono disponibile al meal prep" value={Boolean(p.answers.meal_prep_enabled)} onChange={(v) => p.setValue('meal_prep_enabled', v)} />
    <Switch label="Posso congelare gli avanzi" value={Boolean(p.answers.freeze_leftovers)} onChange={(v) => p.setValue('freeze_leftovers', v)} />
  </Step>;
}

function SportStep(p: Props) {
  return <Step title="Sport e settimana" subtitle="Queste informazioni servono anche a scegliere correttamente eventuali giornate ON/OFF.">
    <Switch label="Faccio sport" value={Boolean(p.answers.does_sport)} onChange={(v) => p.setValue('does_sport', v)} />
    {p.answers.does_sport ? <>
      <MultiWithText title="Quali sport pratichi?" options={['Palestra / sala pesi','Corsa','Camminata','Ciclismo','Nuoto','Tiro con l’arco','Calcio','Basket','Pallavolo','Tennis','Padel','Yoga','Pilates','CrossFit','Arrampicata','Danza']} values={p.answers.sports} onToggle={(v) => p.toggleArray('sports', v)} placeholder="Scrivi un altro sport…" />
      <Switch label="Il mio programma cambia spesso" value={Boolean(p.answers.schedule_changes_often)} onChange={(v) => p.setValue('schedule_changes_often', v)} />
      <Multi title="Quali sport fanno corrispondere la giornata al piano ON?" options={p.answers.sports || []} values={p.answers.on_sports} onToggle={(v) => p.toggleArray('on_sports', v)} />
    </> : null}
  </Step>;
}

function PantryStep(p: Props) {
  return <Step title="Dispensa e spesa" subtitle="Questa parte è facoltativa.">
    <Switch label="Voglio usare Dispensa e Spesa intelligente" value={Boolean(p.answers.pantry_enabled)} onChange={(v) => p.setValue('pantry_enabled', v)} />
    {p.answers.pantry_enabled ? <>
      <Field label="Budget settimanale €" type="number" value={p.answers.weekly_budget} onChange={(v) => p.setValue('weekly_budget', v)} />
      <Field label="Budget mensile €" type="number" value={p.answers.monthly_budget} onChange={(v) => p.setValue('monthly_budget', v)} />
      <MultiWithText title="Supermercati abituali" options={['Lidl','Aldi','Eurospin','MD','Conad','Coop','Esselunga','Carrefour','Pam','Despar','Famila','Prix','Tosano','Rossetto']} values={p.answers.supermarkets} onToggle={(v) => p.toggleArray('supermarkets', v)} placeholder="Scrivi un altro supermercato…" />
    </> : null}
  </Step>;
}

function NotificationsStep(p: Props) {
  return <Step title="Quali promemoria vuoi ricevere?" subtitle="Niente notifiche inutili: scegli solo quelle che ti servono.">
    <Multi title="Notifiche" options={['Pillole','Prodotti in scadenza','Spesa','Pianificazione']} values={(p.answers.notifications || []).map(notificationLabel)} onToggle={(label) => {
      const key = notificationKey(label);
      p.toggleArray('notifications', key);
    }} />
  </Step>;
}

function ReadyStep() {
  return <Step title="Miva è pronta per conoscerti." subtitle="Da qui in poi l'app userà le informazioni che hai scelto per ridurre le decisioni quotidiane.">
    <div className="readyCard">
      <span>✓ Profilo</span><span>✓ Preferenze</span><span>✓ Routine</span><span>✓ Piano</span><span>✓ Organizzazione</span>
    </div>
  </Step>;
}

function Step({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return <section className="questionStep"><h2>{title}</h2><p>{subtitle}</p>{children}</section>;
}

function Field({ label, value, onChange, type = 'text' }: { label: string; value: any; onChange: (value: string) => void; type?: string }) {
  return <label className="formField">{label}<input type={type} value={value ?? ''} onChange={(e) => onChange(e.target.value)} /></label>;
}

function Choice({ title, options, current, onPick }: { title: string; options: string[]; current: any; onPick: (value: string) => void }) {
  return <div className="questionBlock"><b>{title}</b><div className="choiceGrid">{options.map((option) => <button key={option} type="button" className={`option ${String(current) === option ? 'active' : ''}`} onClick={() => onPick(option)}>{option}</button>)}</div></div>;
}

function Multi({ title, options, values, onToggle }: { title: string; options: string[]; values: any; onToggle: (value: string) => void }) {
  const selected = Array.isArray(values) ? values : [];
  return <div className="questionBlock"><b>{title}</b><div className="choiceGrid">{options.map((option) => <button key={option} type="button" className={`option ${selected.includes(option) ? 'active' : ''}`} onClick={() => onToggle(option)}>{option}</button>)}</div></div>;
}

function MultiWithText({ title, options, values, onToggle, placeholder }: { title: string; options: string[]; values: any; onToggle: (value: string) => void; placeholder: string }) {
  const [text, setText] = useState('');
  const selected = Array.isArray(values) ? values : [];
  const suggestions = text.trim() ? options.filter((option) => option.toLowerCase().includes(text.trim().toLowerCase()) && !selected.includes(option)) : [];
  function addCustom() {
    const value = text.trim();
    if (!value) return;
    if (!selected.includes(value)) onToggle(value);
    setText('');
  }
  return <div className="questionBlock">
    <b>{title}</b>
    <div className="choiceGrid">{[...options, ...selected.filter((item: string) => !options.includes(item))].map((option) => <button key={option} type="button" className={`option ${selected.includes(option) ? 'active' : ''}`} onClick={() => onToggle(option)}>{option}</button>)}</div>
    <div className="manualEntry"><input value={text} placeholder={placeholder} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustom(); } }} /><button type="button" onClick={addCustom}>Aggiungi</button></div>
    {suggestions.length ? <div className="suggestionList">{suggestions.map((suggestion) => <button type="button" key={suggestion} onClick={() => { onToggle(suggestion); setText(''); }}>{suggestion}</button>)}</div> : null}
  </div>;
}

function Switch({ label, value, onChange }: { label: string; value: boolean; onChange: (value: boolean) => void }) {
  return <button type="button" className="switchRow" onClick={() => onChange(!value)}><span>{label}</span><span className={`switchControl ${value ? 'on' : ''}`}><i /></span></button>;
}

function notificationKey(label: string) {
  return ({ 'Pillole': 'medications', 'Prodotti in scadenza': 'expirations', 'Spesa': 'shopping', 'Pianificazione': 'planning' } as Record<string, string>)[label] || label;
}

function notificationLabel(key: string) {
  return ({ medications: 'Pillole', expirations: 'Prodotti in scadenza', shopping: 'Spesa', planning: 'Pianificazione' } as Record<string, string>)[key] || key;
}

function toNotificationObject(values: any) {
  const selected = Array.isArray(values) ? values : [];
  return {
    medications: selected.includes('medications'),
    expirations: selected.includes('expirations'),
    shopping: selected.includes('shopping'),
    planning: selected.includes('planning'),
  };
}
