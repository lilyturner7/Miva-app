import AppHeader from '@/components/AppHeader';
import BottomNav from '@/components/BottomNav';
const entries=[
 ['Profilo','/onboarding'],['Piano nutrizionale','/plans'],['Per il nutrizionista','/nutritionist'],['Pillole e promemoria','#'],['Come deve lavorare Miva','#'],['I miei dati','#'],['Progressi e ricompense','#'],['Connessioni','#'],['Impostazioni','#'],['Privacy e dati','#'],['Aiuto','#']
];
export default function MorePage(){return <main className="shell"><section className="phone withBottomNav"><AppHeader eyebrow="MIVA"/><section className="moreMenu">{entries.map(([label,href])=><a key={label} href={href} className={href==='#'?'disabled':''}><span>{label}</span><b>›</b></a>)}</section><BottomNav/></section></main>}
