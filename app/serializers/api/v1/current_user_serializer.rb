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
          # How many top places are rewarded this season (the "prize zone"). A pure
          # app-level constant, surfaced here — like discord_url — so the SPA can read
          # it once at sign-in and highlight the zone in the ranking and the chart.
          rewarded_positions: Typerek::Ranking::REWARDED_POSITIONS,
          discord_url: ENV['TYPEREK_DISCORD_URL'].presence,
          settings: {
            drzewko_mode: user.drzewko_mode?,
            bet_lock: user.bet_lock?,
            push_enabled: user.push_enabled?,
            push_results: user.push_results?,
            push_reminders: user.push_reminders?,
            theme: user.theme,
            favorite_user_ids: user.favorite_user_ids,
            match_order_by_ranking: user.match_order_by_ranking?,
            virtual_players: user.virtual_players?
          }
        }
      end
    end
  end
end