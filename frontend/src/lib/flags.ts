// Team name (as stored in the seed) -> ISO 3166-1 alpha-2 code (gb-eng/gb-sct for
// England/Scotland). Ported verbatim from MatchesHelper::TEAM_FLAGS. Rendered with
// the flag-icons CSS classes (`fi fi-<code>`); unmapped teams render no flag.
export const TEAM_FLAGS: Record<string, string> = {
  Meksyk: 'mx', RPA: 'za', 'Korea Płd.': 'kr', Czechy: 'cz',
  Kanada: 'ca', 'Bośnia i Hercegowina': 'ba', USA: 'us', Paragwaj: 'py',
  Katar: 'qa', Szwajcaria: 'ch', Brazylia: 'br', Maroko: 'ma',
  Haiti: 'ht', Szkocja: 'gb-sct', Australia: 'au', Turcja: 'tr',
  Niemcy: 'de', 'Curaçao': 'cw', Holandia: 'nl', Japonia: 'jp',
  'Wybrzeże Kości Słoniowej': 'ci', Ekwador: 'ec', Szwecja: 'se',
  Tunezja: 'tn', Hiszpania: 'es', 'Zielony Przylądek': 'cv', Belgia: 'be',
  Egipt: 'eg', 'Arabia Saudyjska': 'sa', Urugwaj: 'uy', Iran: 'ir',
  'Nowa Zelandia': 'nz', Francja: 'fr', Senegal: 'sn', Irak: 'iq',
  Norwegia: 'no', Argentyna: 'ar', Algieria: 'dz', Austria: 'at',
  Jordania: 'jo', Portugalia: 'pt', 'DR Kongo': 'cd', Anglia: 'gb-eng',
  Chorwacja: 'hr', Ghana: 'gh', Panama: 'pa', Uzbekistan: 'uz',
  Kolumbia: 'co',
}

export function flagCode(team: string): string | undefined {
  return TEAM_FLAGS[team]
}
