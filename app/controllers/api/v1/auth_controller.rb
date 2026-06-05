# frozen_string_literal: true

module Api
  module V1
    class AuthController < BaseController
      skip_before_action :authenticate!, only: :login

      def login
        user = User.authenticate_by(username: params[:username], password: params[:password])

        unless user
          return render_error(:unauthorized, 'invalid_credentials', 'Niepoprawny login lub hasło')
        end

        render json: auth_result(user)
      end

      # Stateless JWT: the client simply discards the token.
      def logout
        head :no_content
      end
    end
  end
end