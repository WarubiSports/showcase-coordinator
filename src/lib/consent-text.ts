// German consent wording for the selection invite page.
// Source: the PDF draft "Einverständniserklärung: Teilnahme, Foto/Video, Datenverwendung" (22.10.2026),
// adapted for an online form (tick boxes instead of signatures).
// PENDING MAX'S LEGAL REVIEW before any real player sees it. Open points from the PDF: postal address of the
// controller (not yet in the text), whether 1. FC Köln stays in the liability clause, US transfer notice.

export const CONSENT_ORGANIZER = 'Veranstalter: Warubi Sports in Zusammenarbeit mit Athletes USA'
export const CONSENT_CONTROLLER = 'Verantwortlich für die Datenverarbeitung: Warubi Sports, info@warubi-sports.com'

export interface ConsentSection {
  title: string
  paragraphs: string[]
}

export const CONSENT_SECTIONS: ConsentSection[] = [
  {
    title: 'Teilnahme und Haftung',
    paragraphs: [
      'Fußballspiele und das Aufwärmen bergen Verletzungsrisiken (zum Beispiel Zerrungen, Brüche, Gehirnerschütterungen). Ich nehme freiwillig und auf eigene Verantwortung teil. Ich bestätige, dass ich gesund und spielfähig bin und keine Verletzung oder Erkrankung habe, die eine Teilnahme ausschließt. Ich halte mich an die Anweisungen der Spielleitung und der Trainer.',
      'Warubi Sports, Athletes USA, 1. FC Köln sowie deren Mitarbeiter, Trainer, Helfer und Beauftragte haften für Sachschäden nur bei Vorsatz oder grober Fahrlässigkeit. Bei Verletzungen von Leben, Körper oder Gesundheit gilt die gesetzliche Haftung. Für meinen Versicherungsschutz (Kranken- und Unfallversicherung) bin ich selbst verantwortlich. Für mitgebrachte Gegenstände wird keine Haftung übernommen.',
      'Im Notfall dürfen die Verantwortlichen Erste Hilfe leisten und einen Rettungsdienst oder Arzt hinzuziehen. Die angegebene Telefonnummer (bei Spieler/innen unter 18 die des Elternteils) wird so schnell wie möglich informiert.',
    ],
  },
  {
    title: 'Foto- und Videoaufnahmen',
    paragraphs: [
      'Das gesamte Spiel wird mit einer Veo-Kamera aufgezeichnet. Aus der Aufnahme entstehen Spielerclips und Highlight-Videos. Dabei können mein Name, mein Geburtsjahr, meine Position und mein Verein genannt werden. Für die Nutzung erhalte ich keine Vergütung.',
      'Wofür die Aufnahmen verwendet werden dürfen, lege ich mit den beiden Häkchen unten fest.',
    ],
  },
  {
    title: 'Datenverwendung',
    paragraphs: [
      'Die in diesem Formular angegebenen Daten sowie die Angaben zu Schule, Abschluss, Noten und Englischkenntnissen verwenden wir zur Organisation des Spiels und zur Auswertung der Aufnahmen. Mit meinem Häkchen bei "Spielerprofil und College-Recruiting" dürfen diese Daten zusammen mit den Videoclips an Hochschulen und Trainer in den USA übermittelt werden.',
      'Hinweis zur Übermittlung in die USA: Für die meisten Empfänger in den USA, zum Beispiel Hochschulen, gilt kein Angemessenheitsbeschluss der EU. Die Übermittlung erfolgt auf Grundlage meiner ausdrücklichen Einwilligung (Art. 49 Abs. 1 lit. a DSGVO). Ich bin darüber informiert, dass in den USA ein Datenschutzniveau wie in der EU nicht garantiert ist und Betroffenenrechte dort schwerer durchsetzbar sein können.',
      'Die Organisationsdaten werden 12 Monate nach dem Spiel gelöscht. Profil- und Videodaten werden gespeichert, solange eine Betreuung durch Athletes USA oder Warubi Sports besteht, längstens 5 Jahre nach dem Spiel, oder bis zum Widerruf. Ich habe das Recht auf Auskunft, Berichtigung, Löschung und Einschränkung der Verarbeitung sowie das Recht, mich bei einer Datenschutzaufsichtsbehörde zu beschweren. Wer bereits einen Vertrag mit Athletes USA hat: Dessen Datenschutzregeln gelten zusätzlich.',
    ],
  },
  {
    title: 'Freiwilligkeit und Widerruf',
    paragraphs: [
      'Alle Einwilligungen sind freiwillig. Ich kann sie jederzeit mit Wirkung für die Zukunft widerrufen, per E-Mail an info@warubi-sports.com. Nach einem Widerruf werden die Aufnahmen aus künftigen Veröffentlichungen entfernt. Bereits veröffentlichte oder an Dritte weitergegebene Inhalte können nicht in jedem Fall zurückgeholt werden. Ohne das Häkchen bei "Spielerprofil und College-Recruiting" kann ich am Spiel teilnehmen, erhalte aber keine Clips.',
      'Bei Spieler/innen unter 18 stimmt zusätzlich ein Elternteil zu und bestätigt damit alle Punkte dieser Erklärung.',
    ],
  },
]

export const CONSENT_PROFILE_LABEL = 'Spielerprofil und College-Recruiting'
export const CONSENT_PROFILE_HINT = 'Nötig, um deine Clips zu bekommen'
export const CONSENT_PROFILE_TEXT =
  'Die Aufnahmen und Clips dürfen für mein Spielerprofil verwendet und zusammen mit meinen Angaben an Trainer und Hochschulen in den USA (College-Coaches) weitergegeben werden.'

export const CONSENT_SOCIAL_LABEL = 'Social Media und Website'
export const CONSENT_SOCIAL_HINT = 'Freiwillig'
export const CONSENT_SOCIAL_TEXT =
  'Die Aufnahmen dürfen auf den Websites und Social-Media-Kanälen von Athletes USA, Warubi Sports und dem ITP (zum Beispiel Instagram, TikTok, YouTube) sowie in Präsentationen und Druckmaterialien gezeigt werden.'

export const CONSENT_PARENT_TEXT =
  'Ich bin ein Elternteil und stimme allen Punkten dieser Erklärung zu. Ich bestätige, allein sorgeberechtigt zu sein oder im Einverständnis mit dem anderen sorgeberechtigten Elternteil zu handeln.'

export const CONSENT_NAME_LABEL = 'Name der Person, die zustimmt'
export const CONSENT_NAME_HINT_ADULT = 'Dein Vor- und Nachname'
export const CONSENT_NAME_HINT_MINOR = 'Vor- und Nachname des Elternteils'
export const CONSENT_SUBMIT_NOTE = 'Mit dem Absenden bestätigst du, dass du die Erklärung gelesen hast und ihr zustimmst.'
