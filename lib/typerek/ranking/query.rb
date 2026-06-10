# frozen_string_literal: true

module Typerek
  module Ranking
    # The single source of truth for the participant ranking.
    #
    # Ordering: points descending, ties broken by username ascending.
    # Position is shared for equal point totals, e.g. 1, 1, 3.
    class Query
      CACHE_KEY = 'api/v1/ranking'

      # Fingerprint of every input that can change the ranking. Points only come
      # from finished matches, and a bet locks once its match starts (see
      # Typerek::MakeBet::Handler), so answers of finished matches are immutable —
      # the ranking only moves when a match is edited (results/odds) or the set of
      # active users changes. Each of those bumps the relevant table's
      # max(updated_at)/count, so this string changes exactly when a recompute is
      # needed and any cache keyed on it self-invalidates. Shared with
      # Typerek::Ranking::History, which depends on the same inputs.
      def self.cache_version
        [
          Match.maximum(:updated_at)&.to_f,
          Match.count,
          User.maximum(:updated_at)&.to_f,
          User.count
        ].join('-')
      end

      def call
        ordered = active_users.sort do |a, b|
          comparison = b.points <=> a.points
          comparison.zero? ? a.username.downcase <=> b.username.downcase : comparison
        end

        points = ordered.map(&:points)
        ordered.map do |user|
          Entry.new(
            user: user,
            points: user.points,
            accuracy: user.accuracy,
            position: points.index(user.points) + 1
          )
        end
      end

      # The ranking row for the given user (for the app header), or nil when the
      # user is not active and therefore not part of the ranking.
      def entry_for(user)
        call.find { |entry| entry.user.id == user.id }
      end

      private

      def active_users
        @active_users ||= User.includes(answers: :match).active.to_a
      end
    end
  end
end