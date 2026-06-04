# frozen_string_literal: true

module Typerek
  module Ranking
    # The single source of truth for the participant ranking. This logic used to
    # be spread across RankingsController, the ranking view and the
    # current_user_standing helper — now it lives in one place (easy to mirror in
    # a future Spring Boot @Service).
    #
    # Ordering: points descending, ties broken by username ascending.
    # Position is shared for equal point totals, e.g. 1, 1, 3.
    class Query
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