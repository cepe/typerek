# frozen_string_literal: true

module Api
  module V1
    # The `CurrentUser` schema — the signed-in user plus their ranking standing
    # (for the app header). `discord_url` carries the community invite link, kept
    # behind authentication so it is only ever exposed to signed-in members.
    class CurrentUserSerializer
      def self.call(user)
        standing = Typerek::Ranking::Query.standing_for(user)
        {
          id: user.id,
          username: user.username,
          admin: user.admin?,
          standing: standing && { rank: standing[:position], points: standing[:points] },
          discord_url: ENV['TYPEREK_DISCORD_URL'].presence,
          settings: {
            drzewko_mode: user.drzewko_mode?,
            bet_lock: user.bet_lock?,
            push_enabled: user.push_enabled?,
            push_results: user.push_results?,
            push_reminders: user.push_reminders?
          }
        }
      end
    end
  end
end