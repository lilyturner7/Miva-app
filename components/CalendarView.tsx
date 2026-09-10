'use client';
import {useEffect,useMemo,useState} from 'react';
import {createClient} from '@/lib/supabase/client';
import AppHeader from '@/components/AppHeader';
import BottomNav from '@/components/BottomNav';

type Meal={id:string;meal_label:string;planned_time:string|null;status:string;title:string|null;actual_macros:any};
type Day={id:string;plan_date:string;day_type:string|null;daily_meals?:Meal[]};
function iso(d:Date){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
export default function CalendarView(){
 const supabase=useMemo(()=>createClient(),[]); const[days,setDays]=useState<Day[]>([]); const[selected,setSelected]=useState(iso(new Date())); const[loading,setLoading]=useState(true); const[message,setMessage]=useState<string|null>(null);
 useEffect(()=>{void(async()=>{const{data:a}=await supabase.auth.getUser(); if(!a.user){setLoading(false);return} const now=new Date(); const from=new Date(now.getFullYear(),now.getMonth()-1,1); const to=new Date(now.getFullYear(),now.getMonth()+2,0); const{data,error}=await supabase.from('daily_plans').select('id,plan_date,day_type,daily_meals(id,meal_label,planned_time,status,title,actual_macros)').eq('user_id',a.user.id).gte('plan_date',iso(from)).lte('plan_date',iso(to)).order('plan_date'); if(error)setMessage(error.message); setDays((data??[]) as Day[]);setLoading(false)})()},[supabase]);
 const map=new Map(days.map(d=>[d.plan_date,d])); const chosen=map.get(selected); const today=new Date(); const start=new Date(today.getFullYear(),today.getMonth(),1); const end=new Date(today.getFullYear(),today.getMonth()+1,0); const cells:Array<Date|null>=[]; for(let i=0;i<(start.getDay()+6)%7;i++)cells.push(null); for(let d=1;d<=end.getDate();d++)cells.push(new Date(today.getFullYear(),today.getMonth(),d));
 return <main className="shell"><section className="phone withBottomNav"><AppHeader eyebrow="CALENDARIO"/>
  <section className="heroCard"><span className="eyebrow">PASSATO + FUTURO</span><h2>Diario e programmazione.</h2><p>I pasti passati restano modificabili. I giorni futuri servono a programmare sport, ricette ed eventi.</p></section>
  {message?<div className="planMessage">{message}</div>:null}
  <section className="calendarCard"><div className="calendarWeekdays">{['L','M','M','G','V','S','D'].map((x,i)=><b key={i}>{x}</b>)}</div><div className="calendarGrid">{cells.map((d,i)=>d?<button key={i} onClick={()=>setSelected(iso(d))} className={`${iso(d)===selected?'active':''} ${map.has(iso(d))?'hasData':''}`}><span>{d.getDate()}</span>{map.has(iso(d))?<i/>:null}</button>:<span key={i}/>)}</div></section>
  {loading?<div className="planMessage">Carico il diario…</div>:chosen?<section className="dayDetail"><div className="sectionTitleRow"><h3>{new Date(selected+'T12:00:00').toLocaleDateString('it-IT',{weekday:'long',day:'numeric',month:'long'})}</h3><span>{chosen.day_type?.toUpperCase()||''}</span></div>{(chosen.daily_meals??[]).length?chosen.daily_meals!.sort((a,b)=>(a.planned_time||'').localeCompare(b.planned_time||'')).map(m=><a key={m.id} href={`/meal/${m.id}`} className="mealCard compactMeal"><span className="mealCopy"><small>{m.planned_time?.slice(0,5)||''}</small><strong>{m.meal_label}</strong><span>{m.title||'Pasto'}</span><em>{m.status==='eaten'?'Registrato':m.status==='skipped'?'Saltato':'Non registrato / programmato'}</em></span><span className="chevron">›</span></a>):<p className="emptyText">Nessun pasto per questo giorno.</p>}</section>:<section className="emptyStateCard"><strong>{selected>iso(today)?'Programma questa giornata':'Nessun dato registrato'}</strong><p>{selected>iso(today)?'La programmazione avanzata di sport, ricette ed eventi arriva nel prossimo blocco.':'Quando registri pasti o Diario, qui comparirà la cronologia.'}</p></section>}
  <BottomNav/></section></main>
}
