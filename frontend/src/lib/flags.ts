// Team name (as stored in the seed) -> ISO 3166-1 alpha-2 code (gb-eng/gb-sct/
// gb-wls/gb-nir for the home nations, xk for Kosovo). Rendered with the flag-icons
// CSS classes (`fi fi-<code>`); every code below ships with the flag-icons package,
// so unmapped teams render no flag but no team is ever missing its asset.
export const TEAM_FLAGS: Record<string, string> = {
  // --- Current 2026 field (the teams in db/seeds.rb) ---
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

  // --- Future-proofing: teams not in the current schedule but ready if it changes
  //     (e.g. a different tournament, or knockout '?' slots resolved by hand). ---
  // UEFA
  Polska: 'pl', Włochy: 'it', Walia: 'gb-wls', 'Irlandia Północna': 'gb-nir',
  Irlandia: 'ie', Serbia: 'rs', Dania: 'dk', Ukraina: 'ua', Węgry: 'hu',
  Rumunia: 'ro', Grecja: 'gr', Słowacja: 'sk', Słowenia: 'si', Islandia: 'is',
  Finlandia: 'fi', Rosja: 'ru', Bułgaria: 'bg', 'Macedonia Północna': 'mk',
  Albania: 'al', Czarnogóra: 'me', Kosowo: 'xk', Gruzja: 'ge', Armenia: 'am',
  Azerbejdżan: 'az', Białoruś: 'by', Estonia: 'ee', Łotwa: 'lv', Litwa: 'lt',
  Luksemburg: 'lu', Cypr: 'cy', Izrael: 'il', Mołdawia: 'md',
  // CONMEBOL
  Chile: 'cl', Peru: 'pe', Boliwia: 'bo', Wenezuela: 've',
  // CONCACAF
  Kostaryka: 'cr', Honduras: 'hn', Jamajka: 'jm', Salwador: 'sv',
  Gwatemala: 'gt', 'Trynidad i Tobago': 'tt',
  // CAF
  Nigeria: 'ng', Kamerun: 'cm', Mali: 'ml', 'Burkina Faso': 'bf', Gwinea: 'gn',
  Angola: 'ao', Mozambik: 'mz', Zambia: 'zm', Gabon: 'ga', Uganda: 'ug',
  Kenia: 'ke', Tanzania: 'tz', Etiopia: 'et', 'Gwinea Równikowa': 'gq',
  Benin: 'bj', Togo: 'tg', Sudan: 'sd', Libia: 'ly', Mauretania: 'mr',
  'Republika Konga': 'cg', Madagaskar: 'mg',
  // AFC
  'Korea Płn.': 'kp', Chiny: 'cn', Indie: 'in', Indonezja: 'id', Wietnam: 'vn',
  Tajlandia: 'th', 'Zjednoczone Emiraty Arabskie': 'ae', Bahrajn: 'bh',
  Kuwejt: 'kw', Oman: 'om', Liban: 'lb', Syria: 'sy', Palestyna: 'ps',
  Malezja: 'my', Filipiny: 'ph',
  // OFC
  'Nowa Kaledonia': 'nc', Fidżi: 'fj', 'Wyspy Salomona': 'sb',
}

export function flagCode(team: string): string | undefined {
  return TEAM_FLAGS[team]
}
