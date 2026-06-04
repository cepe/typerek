# frozen_string_literal: true

module Api
  module V1
    class ProfileController < BaseController
      def show
        render json: CurrentUserSerializer.call(current_user)
      end
    end
  end
end