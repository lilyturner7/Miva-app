'use client';
import { useRef, useState } from 'react';
import BottomNav from '@/components/BottomNav';
import AppHeader from '@/components/AppHeader';

export default function CameraPage(){
 const input=useRef<HTMLInputElement>(null); const[preview,setPreview]=useState<string|null>(null); const[name,setName]=useState('');
 function picked(file?:File){if(!file)return;setName(file.name);setPreview(URL.createObjectURL(file));}
 return <main className="shell"><section className="phone withBottomNav"><AppHeader eyebrow="CAMERA"/>
   <section className="cameraHero"><h2>Inquadra. Miva capirà il contesto.</h2><p>Nella v1 la Camera acquisisce già una foto dal dispositivo. Il riconoscimento AI verrà collegato dopo il loop Oggi.</p></section>
   <input ref={input} className="hiddenFile" type="file" accept="image/*" capture="environment" onChange={e=>picked(e.target.files?.[0])}/>
   <button className="cameraLaunch" onClick={()=>input.current?.click()}>⌾<span>Apri fotocamera</span></button>
   {preview?<section className="cameraPreview"><img src={preview} alt="Anteprima acquisita"/><strong>{name}</strong><p>Foto acquisita. Nel prossimo step la colleghiamo a extra, Dispensa, Spesa e Ricette in base alla schermata di origine.</p></section>:null}
   <BottomNav/>
 </section></main>
}
