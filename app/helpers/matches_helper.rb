# frozen_string_literal: true

module MatchesHelper
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
