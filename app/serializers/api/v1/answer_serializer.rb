# frozen_string_literal: true

module Api
  module V1
    # The `Answer` schema — the signed-in user's bet on a match.
    class AnswerSerializer
      def self.call(answer)
        {
          match_id: answer.match_id,
          result: answer.result
        }
      end
    end
  end
end