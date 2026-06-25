# frozen_string_literal: true

module Api
  module V1
    # The `VirtualPlayerProfile` schema — a virtual strategy's totals plus its pick
    # on every started match (rendered like a real player's profile, so the client
    # can show the strategy's hits and misses). Mirrors UserProfileSerializer.
    class VirtualPlayerProfileSerializer
      def self.call(profile)
        {
          player: {
            key: profile[:key],
            username: profile[:username],
            points: profile[:points],
            accuracy: profile[:accuracy]
          },
          started_matches: profile[:matches].map do |entry|
            MatchSerializer.call(entry[:match]).merge(answer: entry[:pick]&.to_s)
          end
        }
      end
    end
  end
end
