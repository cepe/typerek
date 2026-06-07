# frozen_string_literal: true

module Api
  module V1
    # The `RankingHistory` schema — bump chart data: finished matches (x-axis)
    # and per-user position/points series aligned to those matches.
    class RankingHistorySerializer
      def self.call(result)
        {
          matches: result.matches.map do |m|
            {
              id: m.id,
              team_a: m.team_a,
              team_b: m.team_b,
              result_a: m.result_a,
              result_b: m.result_b,
              start: m.start
            }
          end,
          series: result.series.map do |entry|
            {
              user: { id: entry.user.id, username: entry.user.username },
              positions: entry.positions,
              points: entry.points
            }
          end
        }
      end
    end
  end
end
