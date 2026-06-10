# frozen_string_literal: true

module Api
  module V1
    # Full bets history: every started match with each participant's bet. Any
    # signed-in user may read it — bets stop being private at match start, the
    # same rule the match detail and user profile endpoints follow.
    class BetsController < BaseController
      def index
        # reorder: the `started` scope sorts start DESC; history reads oldest first.
        matches = Match.started.includes(:answers).accessible_by(current_ability).reorder(:start)
        answers = current_user.answers.index_by(&:match_id).transform_values(&:result)

        render json: matches.map { |match| MatchDetailSerializer.call(match, my_answer: answers[match.id]) }
      end
    end
  end
end
