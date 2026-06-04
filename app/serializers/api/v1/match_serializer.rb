# frozen_string_literal: true

module Api
  module V1
    # The `Match` schema from openapi.yaml. `my_answer` is the given viewer's bet
    # (or nil).
    class MatchSerializer
      # Team name (as stored in the seed) -> ISO 3166-1 alpha-2 code (gb-eng/gb-sct
      # for England/Scotland). The World Cup line-up is fixed, so this map is static;
      # unmapped teams (e.g. knockout placeholders) serialize a null flag.
      TEAM_FLAGS = {
        'Meksyk' => 'mx', 'RPA' => 'za', 'Korea Płd.' => 'kr', 'Czechy' => 'cz',
        'Kanada' => 'ca', 'Bośnia i Hercegowina' => 'ba', 'USA' => 'us', 'Paragwaj' => 'py',
        'Katar' => 'qa', 'Szwajcaria' => 'ch', 'Brazylia' => 'br', 'Maroko' => 'ma',
        'Haiti' => 'ht', 'Szkocja' => 'gb-sct', 'Australia' => 'au', 'Turcja' => 'tr',
        'Niemcy' => 'de', 'Curaçao' => 'cw', 'Holandia' => 'nl', 'Japonia' => 'jp',
        'Wybrzeże Kości Słoniowej' => 'ci', 'Ekwador' => 'ec', 'Szwecja' => 'se',
        'Tunezja' => 'tn', 'Hiszpania' => 'es', 'Zielony Przylądek' => 'cv', 'Belgia' => 'be',
        'Egipt' => 'eg', 'Arabia Saudyjska' => 'sa', 'Urugwaj' => 'uy', 'Iran' => 'ir',
        'Nowa Zelandia' => 'nz', 'Francja' => 'fr', 'Senegal' => 'sn', 'Irak' => 'iq',
        'Norwegia' => 'no', 'Argentyna' => 'ar', 'Algieria' => 'dz', 'Austria' => 'at',
        'Jordania' => 'jo', 'Portugalia' => 'pt', 'DR Kongo' => 'cd', 'Anglia' => 'gb-eng',
        'Chorwacja' => 'hr', 'Ghana' => 'gh', 'Panama' => 'pa', 'Uzbekistan' => 'uz',
        'Kolumbia' => 'co'
      }.freeze

      def self.many(matches, answers_by_match: {})
        matches.map { |match| call(match, my_answer: answers_by_match[match.id]) }
      end

      def self.call(match, my_answer: nil)
        {
          id: match.id,
          team_a: match.team_a,
          team_b: match.team_b,
          team_a_flag: flag(match.team_a),
          team_b_flag: flag(match.team_b),
          start: match.start&.utc&.iso8601,
          started: match.started?,
          finished: match.finished?,
          result_a: match.result_a,
          result_b: match.result_b,
          odds: {
            win_a: match.win_a,
            tie: match.tie,
            win_b: match.win_b,
            win_tie_a: match.win_tie_a,
            win_tie_b: match.win_tie_b,
            not_tie: match.not_tie
          },
          my_answer: my_answer
        }
      end

      def self.flag(team)
        TEAM_FLAGS[team]
      end
    end
  end
end
