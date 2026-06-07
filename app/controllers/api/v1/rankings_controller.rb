# frozen_string_literal: true

module Api
  module V1
    class RankingsController < BaseController
      def show
        render json: RankingEntrySerializer.many(Typerek::Ranking::Query.new.call)
      end

      def history
        render json: RankingHistorySerializer.call(Typerek::Ranking::History.new.call)
      end
    end
  end
end