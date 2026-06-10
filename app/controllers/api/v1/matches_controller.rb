# frozen_string_literal: true

module Api
  module V1
    class MatchesController < BaseController
      def index
        not_finished = Match.not_finished.includes(:answers).accessible_by(current_ability)
        finished = Match.finished.includes(:answers).accessible_by(current_ability)
        answers = current_user.answers.index_by(&:match_id)

        render json: {
          not_finished: MatchSerializer.many(not_finished, answers_by_match: answers),
          finished: MatchSerializer.many(finished, answers_by_match: answers)
        }
      end

      def show
        match = Match.includes(:answers).find(params[:id])
        authorize! :read, match
        render json: detail(match)
      end

      def update
        match = Match.find(params[:id])
        authorize! :update, match

        if match.update(match_params)
          render json: detail(match)
        else
          unprocessable!(match)
        end
      end

      def bet
        answer = Typerek::MakeBet::Handler.new(
          user_id: current_user.id,
          match_id: params[:id],
          result: params[:result]
        ).call
        render json: AnswerSerializer.call(answer)
      rescue Typerek::MatchNotFoundError
        not_found!
      rescue Typerek::Error => e
        unprocessable!(e.message)
      end

      def lock
        answer = Typerek::SetLock::Handler.new(
          user_id: current_user.id,
          match_id: params[:id],
          locked: params[:locked]
        ).call
        render json: AnswerSerializer.call(answer)
      rescue Typerek::MatchNotFoundError
        not_found!
      rescue Typerek::Error => e
        unprocessable!(e.message)
      end

      private

      def detail(match)
        answer = my_answer(match)
        MatchDetailSerializer.call(match, my_answer: answer&.result, my_locked: answer&.locked || false)
      end

      def my_answer(match)
        current_user.answers.find_by(match_id: match.id)
      end

      def match_params
        params.permit(
          :team_a, :team_b, :win_a, :tie, :win_b, :win_tie_a, :win_tie_b, :not_tie,
          :start, :result_a, :result_b
        )
      end
    end
  end
end