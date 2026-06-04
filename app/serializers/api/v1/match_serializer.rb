# frozen_string_literal: true

module Api
  module V1
    # The `Match` schema from openapi.yaml. `my_answer` is the given viewer's bet
    # (or nil).
    class MatchSerializer
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
        MatchesHelper::TEAM_FLAGS[team]
      end
    end
  end
end