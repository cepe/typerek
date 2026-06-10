# frozen_string_literal: true

module Typerek
  module Ranking
    # Builds a time-series of ranking positions for the bump chart.
    #
    # For each finished match (ordered chronologically), cumulative points are
    # accumulated per user and users are re-ranked. Because final scores can be
    # corrected after the fact this is recomputed fully on every call — exactly
    # like Typerek::Ranking::Query — so the chart always stays consistent with
    # the live ranking.
    #
    # Returns:
    #   matches: Array of finished matches in chronological order (x-axis ticks).
    #   series:  Array of { user, positions: [], points: [] } aligned to matches.
    class History
      Result = Struct.new(:matches, :series, keyword_init: true)
      SeriesEntry = Struct.new(:user, :positions, :points, keyword_init: true)

      CACHE_KEY = 'api/v1/ranking_history'

      # The bump chart depends on exactly the same inputs as the live ranking
      # (finished-match results and the set of users), so it reuses the ranking's
      # fingerprint rather than duplicating it. See Query.cache_version.
      def self.cache_version
        Query.cache_version
      end

      def call
        matches = Match.finished.reorder(start: :asc).to_a
        users   = User.includes(answers: :match).active.to_a

        # { user.id => { match.id => answer } }
        answer_index = build_answer_index(users)

        cumulative = users.index_by(&:id).transform_values { 0.0 }

        # { user.id => { positions: [], points: [] } }
        series_data = users.each_with_object({}) do |u, h|
          h[u.id] = { positions: [], points: [] }
        end

        matches.each do |match|
          users.each do |user|
            answer = answer_index.dig(user.id, match.id)
            cumulative[user.id] = (cumulative[user.id] + answer.point).round(2) if answer
          end

          ordered = sort_users(users, cumulative)
          ranked_points = ordered.map { |u| cumulative[u.id] }
          ordered.each do |user|
            position = ranked_points.index(cumulative[user.id]) + 1
            series_data[user.id][:positions] << position
            series_data[user.id][:points]    << cumulative[user.id]
          end
        end

        Result.new(
          matches: matches,
          series:  users.map do |u|
            SeriesEntry.new(user: u, positions: series_data[u.id][:positions], points: series_data[u.id][:points])
          end
        )
      end

      private

      def build_answer_index(users)
        users.each_with_object({}) do |user, idx|
          idx[user.id] = user.answers.index_by(&:match_id)
        end
      end

      # Same ordering as Typerek::Ranking::Query: points desc, username asc.
      def sort_users(users, cumulative)
        users.sort do |a, b|
          cmp = cumulative[b.id] <=> cumulative[a.id]
          cmp.zero? ? a.username.downcase <=> b.username.downcase : cmp
        end
      end
    end
  end
end
