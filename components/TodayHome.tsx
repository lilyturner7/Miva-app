'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import BottomNav from '@/components/BottomNav';
import AppHeader from '@/components/AppHeader';

type MealRow={
  id:string; meal_key:string; meal_label:string; planned_time:string|null; title:string|null; rationale:string|null;
  status?:string; meal_kind?:string; is_ad_hoc?:boolean;
  actual_macros?:{kcal?:number;protein?:number;carbs?:number;fat?:number;extra_items?:number}
};
type Plan={id:string;name:string;plan_type:string;raw_extraction:{meals?:Array<{key:string;label:string;foods:Array<{name:string;quantity?:number;unit?:string}>}>}};

function localDateKey(){const n=new Date();return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-${String(n.getDate()).padStart(2,'0')}`}
const timeKeyMap:Record<string,string>={breakfast:'breakfast_time',morning_snack:'morning_snack_time',lunch:'lunch_time',afternoon_snack:'afternoon_snack_time',dinner:'dinner_time',prebed:'prebed_time',preworkout:'preworkout_snack_time',postworkout:'postworkout_snack_time'};
const defaultTimes:Record<string,string>={breakfast:'08:30',morning_snack:'10:30',lunch:'13:30',afternoon_snack:'16:30',dinner:'20:30',prebed:'22:30',preworkout:'17:30',postworkout:'19:00'};
const mealIcons:Record<string,string>={breakfast:'☕',morning_snack:'◌',lunch:'◉',afternoon_snack:'◌',dinner:'◉',prebed:'☾',preworkout:'↗',postworkout:'↘',snack:'◌'};

export default function TodayHome(){
  const supabase=useMemo(()=>createClient(),[]);
  const[loading,setLoading]=useState(true);
  const[firstName,setFirstName]=useState('');
  const[plan,setPlan]=useState<Plan|null>(null);
  const[meals,setMeals]=useState<MealRow[]>([]);
  const[dailyPlanId,setDailyPlanId]=useState<string|null>(null);
  const[userId,setUserId]=useState<string|null>(null);
  const[showCalories,setShowCalories]=useState(true);
  const[message,setMessage]=useState<string|null>(null);
  const[addingSnack,setAddingSnack]=useState(false);

  async function refresh(){
    const{data:auth}=await supabase.auth.getUser();
    if(!auth.user){setLoading(false);return}
    setUserId(auth.user.id);
    const{data:profile}=await supabase.from('profiles').select('first_name,onboarding_data,show_calories').eq('id',auth.user.id).maybeSingle();
    setFirstName(profile?.first_name||profile?.onboarding_data?.first_name||'');
    setShowCalories(profile?.show_calories !== false);
    const onboarding=profile?.onboarding_data??{};
    const{data:plans}=await supabase.from('nutrition_plans').select('id,name,plan_type,raw_extraction').eq('user_id',auth.user.id).eq('is_active',true).order('created_at',{ascending:true});
    const typed=(plans??[]) as Plan[];
    const selected=typed.find(p=>p.plan_type==='standard')??typed.find(p=>p.plan_type==='off')??typed[0]??null;
    setPlan(selected);
    if(!selected){setMessage('Carica il tuo piano nutrizionale per creare la giornata reale.');setLoading(false);return}
    const today=localDateKey();
    let{data:dailyPlan}=await supabase.from('daily_plans').select('id').eq('user_id',auth.user.id).eq('plan_date',today).maybeSingle();
    if(!dailyPlan){
      const{data:created,error}=await supabase.from('daily_plans').insert({user_id:auth.user.id,plan_date:today,nutrition_plan_id:selected.id,day_type:selected.plan_type,generation_context:{source:'nutrition_plan',generated_at:new Date().toISOString()}}).select('id').single();
      if(error){setMessage(error.message);setLoading(false);return}
      dailyPlan=created;
    }
    setDailyPlanId(dailyPlan.id);
    let{data:mealRows}=await supabase.from('daily_meals').select('id,meal_key,meal_label,planned_time,title,rationale,status,actual_macros,meal_kind,is_ad_hoc').eq('daily_plan_id',dailyPlan.id).order('planned_time',{ascending:true});
    if(!mealRows?.length){
      const parsed=selected.raw_extraction?.meals??[];
      const rows=parsed.map(meal=>{
        const k=timeKeyMap[meal.key];
        const t=k&&onboarding[k]?String(onboarding[k]):defaultTimes[meal.key]??null;
        return{user_id:auth.user.id,daily_plan_id:dailyPlan.id,meal_key:meal.key,meal_label:meal.label,planned_time:t,title:meal.foods.map(f=>f.name).filter(Boolean).slice(0,4).join(', '),rationale:`Dal tuo ${selected.name}`};
      });
      if(rows.length){
        const{data:inserted,error}=await supabase.from('daily_meals').insert(rows).select('id,meal_key,meal_label,planned_time,title,rationale,status,actual_macros,meal_kind,is_ad_hoc');
        if(!error)mealRows=inserted;
      }
    }
    setMeals((mealRows??[]) as MealRow[]);
    setLoading(false);
  }

  useEffect(()=>{void refresh()},[supabase]);

  async function addSnack(){
    if(!userId||!dailyPlanId)return;
    setAddingSnack(true); setMessage(null);
    const now=new Date();
    const time=`${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
    const{data,error}=await supabase.from('daily_meals').insert({
      user_id:userId,daily_plan_id:dailyPlanId,meal_key:'snack',meal_label:'Spuntino',planned_time:time,title:'Spuntino aggiunto',status:'planned',meal_kind:'ad_hoc_snack',is_ad_hoc:true,rationale:'Aggiunto oggi da te'
    }).select('id,meal_key,meal_label,planned_time,title,rationale,status,actual_macros,meal_kind,is_ad_hoc').single();
    setAddingSnack(false);
    if(error){setMessage(error.message);return}
    setMeals(current=>[...current,data as MealRow].sort((a,b)=>(a.planned_time||'99:99').localeCompare(b.planned_time||'99:99')));
  }

  if(loading)return <main className="shell"><section className="phone"><AppHeader eyebrow="OGGI"/><div className="planMessage">Preparo la tua giornata…</div></section></main>;

  const balance=meals.reduce((a,m)=>{const x=m.actual_macros??{};a.kcal+=Number(x.kcal||0);a.protein+=Number(x.protein||0);a.carbs+=Number(x.carbs||0);a.fat+=Number(x.fat||0);a.extras+=Number(x.extra_items||0);if(m.status==='eaten')a.recorded+=1;return a},{kcal:0,protein:0,carbs:0,fat:0,extras:0,recorded:0});

  return <main className="shell"><section className="phone withBottomNav"><AppHeader eyebrow="OGGI"/>
    {!plan?<>
      <section className="heroCard"><span className="eyebrow">PARTIAMO DAL PIANO</span><h2>{firstName?`Ciao ${firstName}.`:'Ciao.'} Miva è pronta.</h2><p>{message}</p></section>
      <a className="primaryAction blockAction" href="/plans">Carica il piano nutrizionale</a>
    </>:<>
      <section className="heroCard"><span className="eyebrow">{plan.plan_type.toUpperCase()} · {plan.name}</span><h2>{firstName?`Ciao ${firstName}, ecco la tua giornata.`:'Ecco la tua giornata.'}</h2><p>Il piano resta il riferimento. Quello che mangi davvero viene registrato separatamente.</p></section>

      <section className="dailyBalance">
        <div><span className="eyebrow">LA TUA GIORNATA</span>{showCalories?<strong>{Math.round(balance.kcal)} kcal</strong>:<strong>{balance.recorded}/{meals.length}</strong>}</div>
        {showCalories?<div className="dailyMacroGrid"><span>P <b>{balance.protein.toFixed(1)} g</b></span><span>C <b>{balance.carbs.toFixed(1)} g</b></span><span>G <b>{balance.fat.toFixed(1)} g</b></span></div>:null}
        {balance.extras>0?<p>＋ {balance.extras} {balance.extras===1?'alimento aggiuntivo registrato':'alimenti aggiuntivi registrati'}.</p>:<p>{balance.recorded} pasti registrati. I pasti lasciati in bianco non vengono considerati saltati.</p>}
      </section>

      {message?<div className="planMessage">{message}</div>:null}

      <section className="timeline">
        {meals.map(meal=><a className={`mealCard ${meal.is_ad_hoc?'adHocMeal':''}`} href={`/meal/${meal.id}`} key={meal.id}>
          <span className="mealIcon">{mealIcons[meal.meal_key]??'○'}</span>
          <span className="mealCopy"><small>{meal.planned_time?.slice(0,5)??''}</small><strong>{meal.meal_label}</strong><span>{meal.title||'Apri per completare il pasto'}</span>{meal.status==='eaten'?<em>Registrato{showCalories?` · ${Math.round(Number(meal.actual_macros?.kcal||0))} kcal`:''}</em>:meal.rationale?<em>{meal.rationale}</em>:null}</span>
          <span className="chevron">›</span>
        </a>)}
        <button className="addSnackCard" disabled={addingSnack} onClick={()=>void addSnack()}>{addingSnack?'Aggiungo…':'＋ Aggiungi spuntino'}</button>
      </section>
    </>}
    <BottomNav/>
  </section></main>;
}
