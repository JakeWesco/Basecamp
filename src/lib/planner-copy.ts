// Everything a hunter reads on the planner page, in the five planner
// languages. {name} is the outfitter, other {words} are filled in by the page.
// Same copy rules as the rest of Basecamp in every language: short
// sentences, no dashes, no exclamation marks. tests/ui/planner.test.ts checks
// every language has every line.

import type { ContactProblem } from "./planner";
import type { Language } from "./planner";
import type { Unit } from "./prices";

export type PlannerCopy = {
  eyebrow: string;
  title: string;
  intro: string;
  label: string;
  placeholder: string;
  examplesLabel: string;
  examples: [string, string, string];
  speak: string;
  stopSpeaking: string;
  submit: string;
  planning: string;
  planningHint: string;
  privacy: string;
  tooShort: string;
  tooLong: string;
  busy: string;
  failed: string;
  expired: string;
  noPackages: string;
  understood: string;
  hunters: string;
  observers: string;
  days: string;
  when: string;
  budget: string;
  notSaid: string;
  fits: string;
  over: string;
  ratesTitle: string;
  trophiesTitle: string;
  total: string;
  onRequest: string;
  atCost: string;
  units: Record<Unit, string>;
  dayByDay: string;
  wholeTrip: string;
  wholeTripHint: string;
  choose: string;
  startAgain: string;
  footnote: string;
  formTitle: string;
  formIntro: string;
  yourName: string;
  email: string;
  phone: string;
  country: string;
  chooseCountry: string;
  consent: string;
  send: string;
  cancel: string;
  problems: Record<ContactProblem, string>;
  sentTitle: string;
  sentBody: string;
  planAnother: string;
};

const en: PlannerCopy = {
  eyebrow: "Hunt planner",
  title: "Plan your hunt with {name}",
  intro: "Tell us who is coming, when, for how long, which animals you want and your budget. You get up to three packages priced from our price list.",
  label: "Your hunt",
  placeholder: "Me and my son, 7 days in June, kudu is a must, around $15,000.",
  examplesLabel: "Or start from one of these",
  examples: [
    "Me and my son, 7 days in June, kudu is a must, around $15,000.",
    "I have $10,000. What can I hunt?",
    "Two hunters and one observer, 10 days in August, sable and nyala.",
  ],
  speak: "Speak",
  stopSpeaking: "Stop listening",
  submit: "Plan my hunt",
  planning: "Planning your hunt",
  planningHint: "This takes about half a minute.",
  privacy: "Your words go to an AI service to build the packages. Leave out passport and payment details.",
  tooShort: "Tell us a little more about the hunt you want.",
  tooLong: "That is too long. Keep it under 1,000 characters.",
  busy: "You have planned a lot of hunts in the last hour. Try again later, or contact {name} directly.",
  failed: "The planner couldn't answer just now. Try again in a minute.",
  expired: "This plan has expired. Plan your hunt again and send it.",
  noPackages: "We couldn't build a package from that. Tell us the animals, the number of days and your budget.",
  understood: "What we understood",
  hunters: "Hunters",
  observers: "Observers",
  days: "Hunting days",
  when: "When",
  budget: "Budget",
  notSaid: "Not given",
  fits: "Fits your budget",
  over: "{amount} over your budget",
  ratesTitle: "Daily rates and extras",
  trophiesTitle: "Trophy fees",
  total: "Total",
  onRequest: "Price on request",
  atCost: "At cost",
  units: { per_day: "per day", per_trip: "per trip", per_round: "per round", per_item: "each" },
  dayByDay: "Day by day",
  wholeTrip: "Whole trip, about {low} to {high}",
  wholeTripHint: "With flights and other costs paid to others.",
  choose: "Send me this package",
  startAgain: "Change my request",
  footnote: "Prices from the {season} price list in {currency}. {name} checks everything and sends you the final quote.",
  formTitle: "Send this package to {name}",
  formIntro: "Give an email or a phone number so they can reach you.",
  yourName: "Your name",
  email: "Email",
  phone: "Phone or WhatsApp",
  country: "Country",
  chooseCountry: "Choose your country",
  consent: "{name} may send me news and offers.",
  send: "Send",
  cancel: "Cancel",
  problems: {
    nameMissing: "Enter your name.",
    nameLong: "That name is too long. Keep it under 120 characters.",
    emailBad: "That email address looks incomplete.",
    phoneBad: "That phone number doesn't look right. Start with + and the country code.",
    phoneCountry: "Choose your country, or start the number with + and the country code.",
    contactMissing: "Enter an email or a phone number.",
  },
  sentTitle: "Sent to {name}",
  sentBody: "Thank you. {name} has your package and will contact you soon with a quote.",
  planAnother: "Plan another hunt",
};

const de: PlannerCopy = {
  eyebrow: "Jagdplaner",
  title: "Planen Sie Ihre Jagd mit {name}",
  intro: "Sagen Sie uns, wer mitkommt, wann, wie lange, welche Wildarten Sie möchten und Ihr Budget. Sie erhalten bis zu drei Pakete mit Preisen aus unserer Preisliste.",
  label: "Ihre Jagd",
  placeholder: "Mein Sohn und ich, 7 Tage im Juni, Kudu ist ein Muss, etwa 15.000 $.",
  examplesLabel: "Oder beginnen Sie mit einem Beispiel",
  examples: [
    "Mein Sohn und ich, 7 Tage im Juni, Kudu ist ein Muss, etwa 15.000 $.",
    "Ich habe 10.000 €. Was kann ich jagen?",
    "Zwei Jäger und ein Begleiter, 10 Tage im August, Rappenantilope und Nyala.",
  ],
  speak: "Sprechen",
  stopSpeaking: "Zuhören beenden",
  submit: "Meine Jagd planen",
  planning: "Ihre Jagd wird geplant",
  planningHint: "Das dauert etwa eine halbe Minute.",
  privacy: "Ihre Angaben gehen an einen Dienst mit künstlicher Intelligenz, der die Pakete erstellt. Bitte keine Daten aus dem Reisepass und keine Zahlungsdaten angeben.",
  tooShort: "Erzählen Sie uns etwas mehr über die Jagd, die Sie möchten.",
  tooLong: "Das ist zu lang. Bitte unter 1.000 Zeichen bleiben.",
  busy: "Sie haben in der letzten Stunde viele Jagden geplant. Versuchen Sie es später noch einmal oder wenden Sie sich direkt an {name}.",
  failed: "Der Planer konnte gerade nicht antworten. Versuchen Sie es in einer Minute noch einmal.",
  expired: "Dieser Plan ist abgelaufen. Planen Sie Ihre Jagd neu und senden Sie sie ab.",
  noPackages: "Daraus konnten wir kein Paket erstellen. Nennen Sie uns die Wildarten, die Anzahl der Tage und Ihr Budget.",
  understood: "Das haben wir verstanden",
  hunters: "Jäger",
  observers: "Begleiter",
  days: "Jagdtage",
  when: "Wann",
  budget: "Budget",
  notSaid: "Nicht angegeben",
  fits: "Passt in Ihr Budget",
  over: "{amount} über Ihrem Budget",
  ratesTitle: "Tagessätze und Extras",
  trophiesTitle: "Trophäengebühren",
  total: "Gesamt",
  onRequest: "Preis auf Anfrage",
  atCost: "Zum Selbstkostenpreis",
  units: { per_day: "pro Tag", per_trip: "pro Fahrt", per_round: "pro Patrone", per_item: "pro Stück" },
  dayByDay: "Tag für Tag",
  wholeTrip: "Ganze Reise, etwa {low} bis {high}",
  wholeTripHint: "Mit Flügen und anderen Kosten, die an Dritte gehen.",
  choose: "Dieses Paket anfragen",
  startAgain: "Anfrage ändern",
  footnote: "Preise aus der Preisliste {season} in {currency}. {name} prüft alles und schickt Ihnen das endgültige Angebot.",
  formTitle: "Dieses Paket an {name} senden",
  formIntro: "Geben Sie eine Mailadresse oder eine Telefonnummer an, damit man Sie erreichen kann.",
  yourName: "Ihr Name",
  email: "Mailadresse",
  phone: "Telefon oder WhatsApp",
  country: "Land",
  chooseCountry: "Land auswählen",
  consent: "{name} darf mir Neuigkeiten und Angebote senden.",
  send: "Senden",
  cancel: "Abbrechen",
  problems: {
    nameMissing: "Bitte geben Sie Ihren Namen ein.",
    nameLong: "Der Name ist zu lang. Bitte unter 120 Zeichen bleiben.",
    emailBad: "Die Mailadresse scheint unvollständig zu sein.",
    phoneBad: "Die Telefonnummer stimmt nicht. Beginnen Sie mit + und der Landesvorwahl.",
    phoneCountry: "Wählen Sie Ihr Land oder beginnen Sie die Nummer mit + und der Landesvorwahl.",
    contactMissing: "Geben Sie eine Mailadresse oder eine Telefonnummer ein.",
  },
  sentTitle: "An {name} gesendet",
  sentBody: "Vielen Dank. {name} hat Ihr Paket erhalten und meldet sich bald mit einem Angebot.",
  planAnother: "Eine weitere Jagd planen",
};

const pl: PlannerCopy = {
  eyebrow: "Planer polowania",
  title: "Zaplanuj polowanie z {name}",
  intro: "Napisz, kto jedzie, kiedy, na jak długo, na jakie zwierzęta chcesz polować i jaki masz budżet. Otrzymasz do trzech pakietów z cenami z naszego cennika.",
  label: "Twoje polowanie",
  placeholder: "Ja i mój syn, 7 dni w czerwcu, kudu to podstawa, około 15 000 $.",
  examplesLabel: "Albo zacznij od jednego z tych przykładów",
  examples: [
    "Ja i mój syn, 7 dni w czerwcu, kudu to podstawa, około 15 000 $.",
    "Mam 10 000 $. Na co mogę zapolować?",
    "Dwóch myśliwych i jeden obserwator, 10 dni w sierpniu, antylopa szablorożna i nyala.",
  ],
  speak: "Powiedz",
  stopSpeaking: "Zakończ słuchanie",
  submit: "Zaplanuj moje polowanie",
  planning: "Planujemy Twoje polowanie",
  planningHint: "To potrwa około pół minuty.",
  privacy: "Twój opis trafia do usługi AI, która tworzy pakiety. Nie podawaj danych paszportowych ani płatniczych.",
  tooShort: "Napisz trochę więcej o polowaniu, którego szukasz.",
  tooLong: "To za długie. Zmieść się w 1000 znaków.",
  busy: "W ostatniej godzinie zaplanowałeś wiele polowań. Spróbuj później albo skontaktuj się bezpośrednio z {name}.",
  failed: "Planer nie mógł teraz odpowiedzieć. Spróbuj ponownie za minutę.",
  expired: "Ten plan wygasł. Zaplanuj polowanie ponownie i wyślij je.",
  noPackages: "Nie udało się z tego zbudować pakietu. Podaj zwierzęta, liczbę dni i budżet.",
  understood: "Co zrozumieliśmy",
  hunters: "Myśliwi",
  observers: "Obserwatorzy",
  days: "Dni polowania",
  when: "Kiedy",
  budget: "Budżet",
  notSaid: "Nie podano",
  fits: "Mieści się w budżecie",
  over: "{amount} ponad budżet",
  ratesTitle: "Stawki dzienne i dodatki",
  trophiesTitle: "Opłaty za trofea",
  total: "Razem",
  onRequest: "Cena na zapytanie",
  atCost: "Po kosztach",
  units: { per_day: "za dzień", per_trip: "za wyjazd", per_round: "za nabój", per_item: "za sztukę" },
  dayByDay: "Dzień po dniu",
  wholeTrip: "Cały wyjazd, około {low} do {high}",
  wholeTripHint: "Z lotami i innymi kosztami płaconymi innym firmom.",
  choose: "Chcę ten pakiet",
  startAgain: "Zmień zapytanie",
  footnote: "Ceny z cennika {season} w {currency}. {name} wszystko sprawdzi i prześle Ci ostateczną ofertę.",
  formTitle: "Wyślij ten pakiet do {name}",
  formIntro: "Podaj adres mailowy albo numer telefonu, żeby mogli się z Tobą skontaktować.",
  yourName: "Imię i nazwisko",
  email: "Adres mailowy",
  phone: "Telefon lub WhatsApp",
  country: "Kraj",
  chooseCountry: "Wybierz kraj",
  consent: "{name} może wysyłać mi nowości i oferty.",
  send: "Wyślij",
  cancel: "Anuluj",
  problems: {
    nameMissing: "Wpisz swoje imię i nazwisko.",
    nameLong: "To imię jest za długie. Zmieść się w 120 znakach.",
    emailBad: "Ten adres mailowy wygląda na niepełny.",
    phoneBad: "Ten numer telefonu wygląda na błędny. Zacznij od + i kodu kraju.",
    phoneCountry: "Wybierz kraj albo zacznij numer od + i kodu kraju.",
    contactMissing: "Wpisz adres mailowy albo numer telefonu.",
  },
  sentTitle: "Wysłano do {name}",
  sentBody: "Dziękujemy. {name} ma Twój pakiet i wkrótce odezwie się z ofertą.",
  planAnother: "Zaplanuj kolejne polowanie",
};

const es: PlannerCopy = {
  eyebrow: "Planificador de caza",
  title: "Planifique su cacería con {name}",
  intro: "Cuéntenos quién viene, cuándo, cuántos días, qué especies quiere cazar y su presupuesto. Recibirá hasta tres paquetes con precios de nuestra lista.",
  label: "Su cacería",
  placeholder: "Mi hijo y yo, 7 días en junio, el kudú es imprescindible, unos 15.000 $.",
  examplesLabel: "O empiece con uno de estos",
  examples: [
    "Mi hijo y yo, 7 días en junio, el kudú es imprescindible, unos 15.000 $.",
    "Tengo 10.000 €. ¿Qué puedo cazar?",
    "Dos cazadores y un acompañante, 10 días en agosto, antílope sable y nyala.",
  ],
  speak: "Hablar",
  stopSpeaking: "Dejar de escuchar",
  submit: "Planificar mi cacería",
  planning: "Planificando su cacería",
  planningHint: "Tarda aproximadamente medio minuto.",
  privacy: "Su texto se envía a un servicio de IA que prepara los paquetes. No incluya datos del pasaporte ni de pago.",
  tooShort: "Cuéntenos un poco más sobre la cacería que busca.",
  tooLong: "Es demasiado largo. Use menos de 1.000 caracteres.",
  busy: "Ha planificado muchas cacerías en la última hora. Inténtelo más tarde o contacte directamente con {name}.",
  failed: "El planificador no pudo responder ahora. Inténtelo de nuevo en un minuto.",
  expired: "Este plan ha caducado. Planifique su cacería de nuevo y envíela.",
  noPackages: "No pudimos crear un paquete con eso. Indíquenos las especies, el número de días y su presupuesto.",
  understood: "Lo que entendimos",
  hunters: "Cazadores",
  observers: "Acompañantes",
  days: "Días de caza",
  when: "Cuándo",
  budget: "Presupuesto",
  notSaid: "No indicado",
  fits: "Dentro de su presupuesto",
  over: "{amount} por encima de su presupuesto",
  ratesTitle: "Tarifas diarias y extras",
  trophiesTitle: "Tasas de trofeo",
  total: "Total",
  onRequest: "Precio a consultar",
  atCost: "A precio de coste",
  units: { per_day: "por día", per_trip: "por viaje", per_round: "por cartucho", per_item: "por unidad" },
  dayByDay: "Día a día",
  wholeTrip: "Viaje completo, entre {low} y {high} aproximadamente",
  wholeTripHint: "Con vuelos y otros gastos que se pagan a terceros.",
  choose: "Quiero este paquete",
  startAgain: "Cambiar mi petición",
  footnote: "Precios de la lista {season} en {currency}. {name} lo revisa todo y le envía el presupuesto final.",
  formTitle: "Enviar este paquete a {name}",
  formIntro: "Indique un correo electrónico o un teléfono para que puedan contactarle.",
  yourName: "Su nombre",
  email: "Correo electrónico",
  phone: "Teléfono o WhatsApp",
  country: "País",
  chooseCountry: "Elija su país",
  consent: "{name} puede enviarme noticias y ofertas.",
  send: "Enviar",
  cancel: "Cancelar",
  problems: {
    nameMissing: "Escriba su nombre.",
    nameLong: "El nombre es demasiado largo. Use menos de 120 caracteres.",
    emailBad: "Ese correo electrónico parece incompleto.",
    phoneBad: "Ese teléfono no parece correcto. Empiece con + y el código del país.",
    phoneCountry: "Elija su país o empiece el número con + y el código del país.",
    contactMissing: "Escriba un correo electrónico o un teléfono.",
  },
  sentTitle: "Enviado a {name}",
  sentBody: "Gracias. {name} ya tiene su paquete y le contactará pronto con un presupuesto.",
  planAnother: "Planificar otra cacería",
};

const fr: PlannerCopy = {
  eyebrow: "Planificateur de chasse",
  title: "Préparez votre chasse avec {name}",
  intro: "Indiquez qui vient, quand, pour combien de jours, quelles espèces vous voulez chasser et votre budget. Vous recevrez jusqu'à trois formules au prix de notre tarif.",
  label: "Votre chasse",
  placeholder: "Mon fils et moi, 7 jours en juin, le koudou est indispensable, environ 15 000 $.",
  examplesLabel: "Ou partez de l'un de ces exemples",
  examples: [
    "Mon fils et moi, 7 jours en juin, le koudou est indispensable, environ 15 000 $.",
    "J'ai 10 000 €. Quelles chasses sont possibles avec ce budget ?",
    "Deux chasseurs et un accompagnant, 10 jours en août, hippotrague noir et nyala.",
  ],
  speak: "Parler",
  stopSpeaking: "Arrêter l'écoute",
  submit: "Préparer ma chasse",
  planning: "Nous préparons votre chasse",
  planningHint: "Cela prend environ trente secondes.",
  privacy: "Votre texte est envoyé à un service d'IA qui prépare les formules. N'indiquez ni passeport ni données de paiement.",
  tooShort: "Donnez un peu plus de détails sur la chasse souhaitée.",
  tooLong: "C'est trop long. Restez sous 1 000 caractères.",
  busy: "Vous avez préparé beaucoup de chasses dans l'heure. Réessayez plus tard ou contactez directement {name}.",
  failed: "Le planificateur n'a pas pu répondre pour l'instant. Réessayez dans une minute.",
  expired: "Ce plan a expiré. Préparez à nouveau votre chasse, puis envoyez votre demande.",
  noPackages: "Nous n'avons pas pu créer de formule à partir de cela. Indiquez les espèces, le nombre de jours et votre budget.",
  understood: "Ce que nous avons compris",
  hunters: "Chasseurs",
  observers: "Accompagnants",
  days: "Jours de chasse",
  when: "Quand",
  budget: "Budget",
  notSaid: "Non précisé",
  fits: "Dans votre budget",
  over: "Dépasse votre budget de {amount}",
  ratesTitle: "Tarifs journaliers et extras",
  trophiesTitle: "Prix des trophées",
  total: "Total",
  onRequest: "Prix sur demande",
  atCost: "Au prix coûtant",
  units: { per_day: "par jour", per_trip: "par trajet", per_round: "par cartouche", per_item: "l'unité" },
  dayByDay: "Jour par jour",
  wholeTrip: "Voyage complet, environ {low} à {high}",
  wholeTripHint: "Avec les vols et les autres frais payés à des tiers.",
  choose: "Je veux cette formule",
  startAgain: "Modifier ma demande",
  footnote: "Prix du tarif {season} en {currency}. {name} vérifie tout et vous envoie le devis final.",
  formTitle: "Envoyer cette formule à {name}",
  formIntro: "Indiquez une adresse mail ou un téléphone pour qu'on puisse vous joindre.",
  yourName: "Votre nom",
  email: "Adresse mail",
  phone: "Téléphone ou WhatsApp",
  country: "Pays",
  chooseCountry: "Choisissez votre pays",
  consent: "{name} peut m'envoyer des nouvelles et des offres.",
  send: "Envoyer",
  cancel: "Annuler",
  problems: {
    nameMissing: "Indiquez votre nom.",
    nameLong: "Ce nom est trop long. Restez sous 120 caractères.",
    emailBad: "Cette adresse mail semble incomplète.",
    phoneBad: "Ce numéro ne semble pas correct. Commencez par + et l'indicatif du pays.",
    phoneCountry: "Choisissez votre pays ou commencez le numéro par + et l'indicatif du pays.",
    contactMissing: "Indiquez une adresse mail ou un numéro de téléphone.",
  },
  sentTitle: "Envoyé à {name}",
  sentBody: "Merci. {name} a reçu votre formule et vous contactera bientôt avec un devis.",
  planAnother: "Préparer une autre chasse",
};

export const PLANNER_COPY: Record<Language, PlannerCopy> = { en, de, pl, es, fr };

/** Fills in {words}. */
export function fill(text: string, values: Record<string, string>): string {
  return text.replace(/\{(\w+)\}/g, (m, key: string) => values[key] ?? m);
}

/** BCP 47 locale for numbers, dates and speech recognition. */
export const LOCALE: Record<Language, string> = { en: "en-US", de: "de-DE", pl: "pl-PL", es: "es-ES", fr: "fr-FR" };
