# frozen_string_literal: true

module Api
  module V1
    class RankingsController < BaseController
      def show
        query = Typerek::Ranking::Query
        json = Rails.cache.fetch(
          [query::CACHE_KEY, query.cache_version],
          expires_in: 1.day
        ) do
          {
            entries: RankingEntrySerializer.many(query.new.call),
            # The season's point ceiling (a flawless tipster), so the client can
            # show how far the field is from perfect. Depends only on finished
            # matches, so it shares the ranking's cache fingerprint.
            perfect_score: Match.perfect_score,
            # Three naive benchmark strategies, scored over the finished matches. An
            # opt-in client overlay (the virtual_players setting); always computed
            # here since it shares the ranking's cache fingerprint and is cheap.
            virtual_players: Typerek::Ranking::VirtualPlayers.call
          }.to_json
        end
        render json: json
      end

      # One virtual strategy's profile: its totals plus its pick on every started
      # match, so the client can show how the strategy's hits look. 404 for an
      # unknown key. Not cached — a per-strategy detail view, hit infrequently.
      def virtual_player
        profile = Typerek::Ranking::VirtualPlayers.profile(params[:key])
        return head :not_found unless profile

        render json: VirtualPlayerProfileSerializer.call(profile)
      end

      def history
        history = Typerek::Ranking::History
        json = Rails.cache.fetch(
          [history::CACHE_KEY, history.cache_version],
          expires_in: 1.day
        ) do
          RankingHistorySerializer.call(history.new.call).to_json
        end
        render json: json
      end
    end
  end
end