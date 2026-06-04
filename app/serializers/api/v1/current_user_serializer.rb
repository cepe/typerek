# frozen_string_literal: true

module Api
  module V1
    # The `CurrentUser` schema — the signed-in user plus their ranking standing
    # (for the app header).
    class CurrentUserSerializer
      def self.call(user)
        entry = Typerek::Ranking::Query.new.entry_for(user)
        {
          id: user.id,
          username: user.username,
          admin: user.admin?,
          standing: entry && { rank: entry.position, points: entry.points }
        }
      end
    end
  end
end