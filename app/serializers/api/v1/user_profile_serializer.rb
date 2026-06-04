# frozen_string_literal: true

module Api
  module V1
    # The `UserProfile` schema — a user's profile with their bets on started matches.
    class UserProfileSerializer
      def self.call(user, started_matches:)
        answers_by_match = user.answers.index_by(&:match_id)
        {
          user: {
            id: user.id,
            username: user.username,
            accuracy: user.accuracy
          },
          started_matches: started_matches.map do |match|
            MatchSerializer.call(match).merge(answer: answers_by_match[match.id]&.result)
          end
        }
      end
    end
  end
end