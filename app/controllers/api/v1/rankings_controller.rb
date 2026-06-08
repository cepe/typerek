# frozen_string_literal: true

module Api
  module V1
    class RankingsController < BaseController
      def show
        render json: RankingEntrySerializer.many(Typerek::Ranking::Query.new.call)
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