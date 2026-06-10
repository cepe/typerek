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

      # Position + points for every active user, keyed by user id, as plain data
      # (an Entry wraps an AR record and does not cache cleanly). Shares the public
      # ranking's fingerprint via cache_version, so it self-invalidates on exactly
      # the same inputs — and spares GET /me from recomputing the whole ranking on
      # every request.
      def self.standings
        Rails.cache.fetch([CACHE_KEY, 'standings', cache_version], expires_in: 1.day) do
          new.call.each_with_object({}) do |entry, standings|
            standings[entry.user.id] = { position: entry.position, points: entry.points }
          end
        end
      end

      # The given user's standing ({ position:, points: }) for the app header, or
      # nil when they are not active and so not part of the ranking.
      def self.standing_for(user)
        standings[user.id]
      end

      def call
        # Score every user once up front. Computing points lazily inside the sort
        # comparator instead means re-summing each user's answers on every
        # comparison (O(n log n) times), which is what made the ranking slow.
        scored = active_users.map do |user|
          { user: user, points: user.points, accuracy: user.accuracy }
        end

        scored.sort! do |a, b|
          by_points = b[:points] <=> a[:points]
          by_points.zero? ? a[:user].username.downcase <=> b[:user].username.downcase : by_points
        end

        points = scored.map { |row| row[:points] }
        scored.map do |row|
          Entry.new(
            user: row[:user],
            points: row[:points],
            accuracy: row[:accuracy],
            position: points.index(row[:points]) + 1
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