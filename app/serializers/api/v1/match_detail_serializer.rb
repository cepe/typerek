# frozen_string_literal: true

module Api
  module V1
    # The `MatchDetail` schema: Match + `participants` (their bets), visible only
    # once the match has started.
    class MatchDetailSerializer
      def self.call(match, my_answer: nil, my_locked: false)
        data = MatchSerializer.call(match, my_answer: my_answer, my_locked: my_locked)
        data[:participants] = participants(match) if match.started?
        data
      end

      def self.participants(match)
        answers = match.answers.group_by(&:user_id).transform_values(&:first)
        # Each participant's current ranking position, so the client can optionally
        # order the list by standings (the match_order_by_ranking setting). Read from
        # the cached standings map — every active user has an entry. Default order
        # stays alphabetical; the client re-sorts when the setting is on.
        standings = Typerek::Ranking::Query.standings
        User.active.order(:username).map do |user|
          answer = answers[user.id]
          {
            user: { id: user.id, username: user.username },
            result: answer&.result,
            position: standings.dig(user.id, :position)
          }
        end
      end
    end
  end
end