// Names as Base's matcher compares them (case, spaces and hyphens ignored), plus German umlaut folding so
// "Müller" and "Mueller" meet; other accents are stripped. Client safe (the invite form uses it too).
export const normalizeName = (s: string | null | undefined): string =>
  (s ?? '')
    .toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[\s\-'’.]+/g, '')

// Club names: same folding, letters and digits only ("SSV Jan Wellem 05" and "Jan Wellem" meet as substrings)
export const normalizeClub = (s: string | null | undefined): string => normalizeName(s).replace(/[^a-z0-9]/g, '')
