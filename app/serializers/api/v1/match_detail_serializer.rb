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
        User.active.order(:username).map do |user|
          answer = answers[user.id]
          {
            user: { id: user.id, username: user.username },
            result: answer&.result
          }
        end
      end
    end
  end
end