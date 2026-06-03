# frozen_string_literal: true

module MatchesHelper
  # Team name (as stored in the seed) -> ISO 3166-1 alpha-2 code (gb-eng/gb-sct for
  # England/Scotland). The World Cup line-up is fixed, so this map is static.
  # Knockout placeholders ("?") and anything unmapped simply render without a flag.
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

  # Renders the team's flag (decorative — the name is always shown next to it),
  # or nothing for unknown teams / knockout placeholders.
  def flag_icon(team, classes: 'mr-1 inline-block h-3.5 w-5 rounded-sm align-[-0.15em]')
    code = TEAM_FLAGS[team]
    return unless code

    image_tag "flags/#{code}.svg", alt: '', aria: { hidden: true }, class: classes, loading: 'lazy'
  end

  # The six bet types, in display order: [result_key, label].
  BET_TYPES = [
    %w[win_a 1],
    %w[tie X],
    %w[win_b 2],
    %w[win_tie_a 1X],
    %w[win_tie_b X2],
    %w[not_tie 12]
  ].freeze

  # CSS classes for an interactive bet pill (the 1 / X / 2 ... row).
  def bet_pill_class(active:, started:)
    if active
      "bet bet-active#{' pointer-events-none' if started}"
    elsif started
      'bet bet-locked'
    else
      'bet bet-idle'
    end
  end

  def formatted_odds(value)
    value.present? ? number_with_precision(value, precision: 2) : '—'
  end

  def formatted_score(match)
    if match.result_a.present? && match.result_b.present?
      "#{match.result_a}:#{match.result_b}"
    else
      '–:–'
    end
  end
end
