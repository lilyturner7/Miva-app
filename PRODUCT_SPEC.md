# Miva — Product Specification v1

## Missione
Miva trasforma un piano nutrizionale già prescritto da un professionista in decisioni alimentari quotidiane concrete. Non prescrive diete: propone cosa mangiare, adatta la giornata agli imprevisti, usa dispensa/scadenze e impara gusti e routine.

Principio UX: **Miva propone prima, l’utente decide dopo.**

## Utenti
- maggiorenni
- con uno o più piani nutrizionali
- futuro: Free, Premium, Business per studi nutrizionali
- lingue: IT, EN, ES, FR

## Navigazione post-onboarding
1. Oggi — cosa mangio oggi?
2. Piano — cosa mangerò nei prossimi giorni?
3. Dispensa — cosa ho e cosa devo consumare?
4. Spesa — cosa devo comprare?
5. Diario — come sto?
Profilo/Impostazioni dall’avatar.

## Primo accesso
Onboarding approvato come struttura: account/avatar; dati fisici e obiettivi; stile alimentare; allergie/intolleranze/condizioni/farmaci; digestione e cotture; calorie e delicatezza; upload PDF/Word/Excel e multi-piano; gusti estratti dal piano; routine dei pasti; abitudini; cucina; pianificazione/meal prep; sport e ON/OFF; dispensa/spesa; notifiche; conferma finale.

## Accesso quotidiano
Alla prima apertura del giorno:
1. splash motivazionale stile Opal
2. domanda facoltativa “Hai qualcosa di particolare in programma oggi?” (pasto libero, dolce, aperitivo, ristorante, bar/mensa, sport diverso, altro)
3. Home Oggi
Negli accessi successivi dello stesso giorno si apre direttamente Oggi.

## Oggi
Timeline adattiva: Colazione → Spuntino mattina → Pranzo → Spuntino pomeriggio → Cena → Pre-nanna, mostrando solo i momenti configurati/presenti nel piano. Tra i pasti possono comparire pillole/promemoria.

Ogni pasto mostra una proposta primaria. Tap sul pasto apre una bottom sheet con: proposta consigliata + breve “perché”; 2–3 alternative compatibili; ricette personali; composizione manuale; conferma grammature reali. Il motore Chef è incorporato qui, non è una pagina autonoma.

Azioni contestuali: Ho fame; Ho voglia di dolce; pasto/dolce programmato; sono fuori casa. Se un evento futuro è noto (es. pizza + gelato), Miva pianifica i pasti precedenti tenendone conto. Dopo un consumo diverso dal previsto ricalcola i pasti successivi senza logiche punitive.

## Spuntini e comportamento
Quando utile, Miva chiede il motivo dello spuntino: fame, pre/post workout, noia, stress, cibo visto, offerto, socialità, altro. Registrazioni ripetute nello stesso slot possono attivare una domanda non giudicante per distinguere dimenticanza di registrazione da spilucco. L’utente sceglie il livello di intervento comportamentale.

## Piano
Vista 2/5/7 giorni. Card giornaliere con ON/OFF, sport/eventi e pasti principali. Progressive disclosure: quantità e dettagli solo al tap.

## Dispensa
Opzionale. Non deve essere un inventario ossessivo. Priorità visiva: da usare presto, aperti, frigo, freezer, dispensa. Inserimento tramite barcode, etichetta, manuale o futuro scontrino. Quantità anche approssimative. Scadenza e prezzo quando utili.

## Spesa
Lista = fabbisogno dei prossimi giorni − disponibilità in casa. Aggiunte manuali consentite. Budget settimanale/mensile e supermercati abituali. Offerte solo se dati attendibili. Scanner prodotto con due dimensioni separate: qualità nutrizionale e compatibilità col piano personale. Allergie/intolleranze hanno priorità sugli score.

## Diario
Interazione stile Flo. Categorie: Umore, Energia, Sazietà, Digestione, Sonno, Stress, Attività. Tap categoria → opzioni visuali. Nel tempo Miva può segnalare associazioni tra pasti/alimenti e sintomi, senza diagnosticare allergie o patologie.

## Pillole
Promemoria/registro, non terapia. Inseribile tra pasti con nome e orario; cerchio vuoto da spuntare dopo assunzione. Notifiche configurabili.

## Dati e priorità
Vincoli hard: allergie/sicurezza, piano professionale e relative equivalenze. Criteri di ranking tra opzioni compatibili: gusti, scadenze, comodità/tempo, routine, costo, preferenze vegetali. Le priorità configurabili non devono poter trasformare un criterio economico in permesso di violare un vincolo sanitario/nutrizionale.

## Grafica
Mobile-first, morbida e non clinica. Verde salvia primario, sfondo avorio/crema, tocchi pesca/lilla, card arrotondate, ombre leggere, molto spazio bianco. Ispirazioni funzionali: Opal (calma/splash), Flo (registrazione guidata), Yuka (leggibilità scanner), FatSecret (solo pattern di registrazione). Progressive disclosure per evitare dashboard dense.

## Apprendimento
L’app deve richiedere meno lavoro nel tempo. Impara pasti accettati, ricette preferite, correzioni, routine, frequenza sport, consumo dispensa, tempi di cucina e pattern comportamentali. Obiettivo: dopo alcune settimane, una giornata normale richiede pochissimi tap.

## Architettura tecnica proposta
Fase 1: prototipo web/PWA stabile con persistenza locale e motore regole dimostrativo.
Fase 2: backend/account/database, parser piano, food/barcode DB, storage e sincronizzazione.
Fase 3: app iOS/Android (cross-platform), fotocamera/scanner, notifiche native, offline/cache.
Fase 4: AI/ottimizzazione avanzata, scontrini, calendario, eventuali integrazioni esterne, Business nutrizionisti.

## Cosa non deve fare Miva
- prescrivere autonomamente una dieta clinica
- diagnosticare allergie/intolleranze
- modificare terapie o farmaci
- usare compensazioni punitive
- moralizzare alimenti con “buono/cattivo”
- fingere precisione da foto quando quantità/ingredienti non sono verificabili
- costringere a usare dispensa, calorie o notifiche

## Metriche di prodotto
- % proposte accettate senza modifica
- tap medi per giornata/pasto
- frequenza spesa e spreco percepito
- tempo di pianificazione risparmiato
- accuratezza delle preferenze apprese
- correzioni necessarie alle proposte
- retention e completamento onboarding
