# frozen_string_literal: true

# This file should contain all the record creation needed to seed the database with its default values.
# The data can then be loaded with the rake db:seed (or created alongside the db with db:setup).
#
# Examples:
#
#   cities = City.create([{ :name => 'Chicago' }, { :name => 'Copenhagen' }])
#   Mayor.create(:name => 'Emanuel', :city => cities.first)

User.create(
  username: ENV.fetch('TYPEREK_ADMIN_USERNAME'),
  password: ENV.fetch('TYPEREK_ADMIN_PASSWORD'),
  admin: true,
  invitation_accepted_at: Time.zone.now
)

# Harmonogram Mistrzostw Świata FIFA 2026 (USA / Kanada / Meksyk), 11 czerwca – 19 lipca 2026.
# Godziny podane w polskim czasie (CEST, UTC+2). Faza grupowa – realne pary po losowaniu
# z 5 grudnia 2025. Faza pucharowa – sloty z placeholderami '?' (drużyny znane dopiero po
# zakończeniu wcześniejszych rund).
matches = [
  # Faza grupowa
  { start: '2026-06-11 21:00 CEST', team_a: 'Meksyk', team_b: 'RPA' },
  { start: '2026-06-12 04:00 CEST', team_a: 'Korea Płd.', team_b: 'Czechy' },
  { start: '2026-06-12 21:00 CEST', team_a: 'Kanada', team_b: 'Bośnia i Hercegowina' },
  { start: '2026-06-13 03:00 CEST', team_a: 'USA', team_b: 'Paragwaj' },
  { start: '2026-06-13 21:00 CEST', team_a: 'Katar', team_b: 'Szwajcaria' },
  { start: '2026-06-14 00:00 CEST', team_a: 'Brazylia', team_b: 'Maroko' },
  { start: '2026-06-14 03:00 CEST', team_a: 'Haiti', team_b: 'Szkocja' },
  { start: '2026-06-14 06:00 CEST', team_a: 'Australia', team_b: 'Turcja' },
  { start: '2026-06-14 19:00 CEST', team_a: 'Niemcy', team_b: 'Curaçao' },
  { start: '2026-06-14 22:00 CEST', team_a: 'Holandia', team_b: 'Japonia' },
  { start: '2026-06-15 01:00 CEST', team_a: 'Wybrzeże Kości Słoniowej', team_b: 'Ekwador' },
  { start: '2026-06-15 04:00 CEST', team_a: 'Szwecja', team_b: 'Tunezja' },
  { start: '2026-06-15 18:00 CEST', team_a: 'Hiszpania', team_b: 'Zielony Przylądek' },
  { start: '2026-06-15 21:00 CEST', team_a: 'Belgia', team_b: 'Egipt' },
  { start: '2026-06-16 00:00 CEST', team_a: 'Arabia Saudyjska', team_b: 'Urugwaj' },
  { start: '2026-06-16 03:00 CEST', team_a: 'Iran', team_b: 'Nowa Zelandia' },
  { start: '2026-06-16 21:00 CEST', team_a: 'Francja', team_b: 'Senegal' },
  { start: '2026-06-17 00:00 CEST', team_a: 'Irak', team_b: 'Norwegia' },
  { start: '2026-06-17 03:00 CEST', team_a: 'Argentyna', team_b: 'Algieria' },
  { start: '2026-06-17 06:00 CEST', team_a: 'Austria', team_b: 'Jordania' },
  { start: '2026-06-17 19:00 CEST', team_a: 'Portugalia', team_b: 'DR Kongo' },
  { start: '2026-06-17 22:00 CEST', team_a: 'Anglia', team_b: 'Chorwacja' },
  { start: '2026-06-18 01:00 CEST', team_a: 'Ghana', team_b: 'Panama' },
  { start: '2026-06-18 04:00 CEST', team_a: 'Uzbekistan', team_b: 'Kolumbia' },
  { start: '2026-06-18 18:00 CEST', team_a: 'Czechy', team_b: 'RPA' },
  { start: '2026-06-18 21:00 CEST', team_a: 'Szwajcaria', team_b: 'Bośnia i Hercegowina' },
  { start: '2026-06-19 00:00 CEST', team_a: 'Kanada', team_b: 'Katar' },
  { start: '2026-06-19 03:00 CEST', team_a: 'Meksyk', team_b: 'Korea Płd.' },
  { start: '2026-06-19 21:00 CEST', team_a: 'USA', team_b: 'Australia' },
  { start: '2026-06-20 00:00 CEST', team_a: 'Szkocja', team_b: 'Maroko' },
  { start: '2026-06-20 02:30 CEST', team_a: 'Brazylia', team_b: 'Haiti' },
  { start: '2026-06-20 05:00 CEST', team_a: 'Turcja', team_b: 'Paragwaj' },
  { start: '2026-06-20 19:00 CEST', team_a: 'Holandia', team_b: 'Szwecja' },
  { start: '2026-06-20 22:00 CEST', team_a: 'Niemcy', team_b: 'Wybrzeże Kości Słoniowej' },
  { start: '2026-06-21 02:00 CEST', team_a: 'Ekwador', team_b: 'Curaçao' },
  { start: '2026-06-21 06:00 CEST', team_a: 'Tunezja', team_b: 'Japonia' },
  { start: '2026-06-21 18:00 CEST', team_a: 'Hiszpania', team_b: 'Arabia Saudyjska' },
  { start: '2026-06-21 21:00 CEST', team_a: 'Belgia', team_b: 'Iran' },
  { start: '2026-06-22 00:00 CEST', team_a: 'Urugwaj', team_b: 'Zielony Przylądek' },
  { start: '2026-06-22 03:00 CEST', team_a: 'Nowa Zelandia', team_b: 'Egipt' },
  { start: '2026-06-22 19:00 CEST', team_a: 'Argentyna', team_b: 'Austria' },
  { start: '2026-06-22 23:00 CEST', team_a: 'Francja', team_b: 'Irak' },
  { start: '2026-06-23 02:00 CEST', team_a: 'Norwegia', team_b: 'Senegal' },
  { start: '2026-06-23 05:00 CEST', team_a: 'Jordania', team_b: 'Algieria' },
  { start: '2026-06-23 19:00 CEST', team_a: 'Portugalia', team_b: 'Uzbekistan' },
  { start: '2026-06-23 22:00 CEST', team_a: 'Anglia', team_b: 'Ghana' },
  { start: '2026-06-24 01:00 CEST', team_a: 'Panama', team_b: 'Chorwacja' },
  { start: '2026-06-24 04:00 CEST', team_a: 'Kolumbia', team_b: 'DR Kongo' },
  { start: '2026-06-24 21:00 CEST', team_a: 'Szwajcaria', team_b: 'Kanada' },
  { start: '2026-06-24 21:00 CEST', team_a: 'Bośnia i Hercegowina', team_b: 'Katar' },
  { start: '2026-06-25 00:00 CEST', team_a: 'Maroko', team_b: 'Haiti' },
  { start: '2026-06-25 00:00 CEST', team_a: 'Szkocja', team_b: 'Brazylia' },
  { start: '2026-06-25 03:00 CEST', team_a: 'RPA', team_b: 'Korea Płd.' },
  { start: '2026-06-25 03:00 CEST', team_a: 'Czechy', team_b: 'Meksyk' },
  { start: '2026-06-25 22:00 CEST', team_a: 'Curaçao', team_b: 'Wybrzeże Kości Słoniowej' },
  { start: '2026-06-25 22:00 CEST', team_a: 'Ekwador', team_b: 'Niemcy' },
  { start: '2026-06-26 01:00 CEST', team_a: 'Tunezja', team_b: 'Holandia' },
  { start: '2026-06-26 01:00 CEST', team_a: 'Japonia', team_b: 'Szwecja' },
  { start: '2026-06-26 04:00 CEST', team_a: 'Turcja', team_b: 'USA' },
  { start: '2026-06-26 04:00 CEST', team_a: 'Paragwaj', team_b: 'Australia' },
  { start: '2026-06-26 21:00 CEST', team_a: 'Norwegia', team_b: 'Francja' },
  { start: '2026-06-26 21:00 CEST', team_a: 'Senegal', team_b: 'Irak' },
  { start: '2026-06-27 02:00 CEST', team_a: 'Zielony Przylądek', team_b: 'Arabia Saudyjska' },
  { start: '2026-06-27 02:00 CEST', team_a: 'Urugwaj', team_b: 'Hiszpania' },
  { start: '2026-06-27 05:00 CEST', team_a: 'Nowa Zelandia', team_b: 'Belgia' },
  { start: '2026-06-27 05:00 CEST', team_a: 'Egipt', team_b: 'Iran' },
  { start: '2026-06-27 23:00 CEST', team_a: 'Panama', team_b: 'Anglia' },
  { start: '2026-06-27 23:00 CEST', team_a: 'Chorwacja', team_b: 'Ghana' },
  { start: '2026-06-28 01:30 CEST', team_a: 'Kolumbia', team_b: 'Portugalia' },
  { start: '2026-06-28 01:30 CEST', team_a: 'DR Kongo', team_b: 'Uzbekistan' },
  { start: '2026-06-28 04:00 CEST', team_a: 'Algieria', team_b: 'Austria' },
  { start: '2026-06-28 04:00 CEST', team_a: 'Jordania', team_b: 'Argentyna' },
  # 1/16 finału
  { start: '2026-06-28 21:00 CEST', team_a: '?', team_b: '?' },
  { start: '2026-06-29 19:00 CEST', team_a: '?', team_b: '?' },
  { start: '2026-06-29 22:30 CEST', team_a: '?', team_b: '?' },
  { start: '2026-06-30 03:00 CEST', team_a: '?', team_b: '?' },
  { start: '2026-06-30 19:00 CEST', team_a: '?', team_b: '?' },
  { start: '2026-06-30 23:00 CEST', team_a: '?', team_b: '?' },
  { start: '2026-07-01 03:00 CEST', team_a: '?', team_b: '?' },
  { start: '2026-07-01 18:00 CEST', team_a: '?', team_b: '?' },
  { start: '2026-07-01 22:00 CEST', team_a: '?', team_b: '?' },
  { start: '2026-07-02 02:00 CEST', team_a: '?', team_b: '?' },
  { start: '2026-07-02 21:00 CEST', team_a: '?', team_b: '?' },
  { start: '2026-07-03 00:00 CEST', team_a: '?', team_b: '?' },
  { start: '2026-07-03 01:00 CEST', team_a: '?', team_b: '?' },
  { start: '2026-07-03 05:00 CEST', team_a: '?', team_b: '?' },
  { start: '2026-07-03 20:00 CEST', team_a: '?', team_b: '?' },
  { start: '2026-07-04 03:30 CEST', team_a: '?', team_b: '?' },
  # 1/8 finału
  { start: '2026-07-04 19:00 CEST', team_a: '?', team_b: '?' },
  { start: '2026-07-04 23:00 CEST', team_a: '?', team_b: '?' },
  { start: '2026-07-05 22:00 CEST', team_a: '?', team_b: '?' },
  { start: '2026-07-06 02:00 CEST', team_a: '?', team_b: '?' },
  { start: '2026-07-06 21:00 CEST', team_a: '?', team_b: '?' },
  { start: '2026-07-07 02:00 CEST', team_a: '?', team_b: '?' },
  { start: '2026-07-07 18:00 CEST', team_a: '?', team_b: '?' },
  { start: '2026-07-07 22:00 CEST', team_a: '?', team_b: '?' },
  # Ćwierćfinały
  { start: '2026-07-09 22:00 CEST', team_a: '?', team_b: '?' },
  { start: '2026-07-10 21:00 CEST', team_a: '?', team_b: '?' },
  { start: '2026-07-11 23:00 CEST', team_a: '?', team_b: '?' },
  { start: '2026-07-12 03:00 CEST', team_a: '?', team_b: '?' },
  # Półfinały
  { start: '2026-07-14 21:00 CEST', team_a: '?', team_b: '?' },
  { start: '2026-07-15 21:00 CEST', team_a: '?', team_b: '?' },
  # Mecz o 3. miejsce
  { start: '2026-07-18 23:00 CEST', team_a: '?', team_b: '?' },
  # Finał
  { start: '2026-07-19 21:00 CEST', team_a: '?', team_b: '?' }
]

matches.each do |match|
  Match.create(match)
end
