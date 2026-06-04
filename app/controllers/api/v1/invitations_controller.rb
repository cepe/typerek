# frozen_string_literal: true

module Api
  module V1
    class InvitationsController < BaseController
      skip_before_action :authenticate!

      def show
        user = find_by_token!
        render json: InvitationSerializer.info(user)
      rescue ActiveSupport::MessageVerifier::InvalidSignature, ActiveRecord::RecordNotFound
        invalid_token!
      end

      def accept
        user = find_by_token!
        if user.accept_invitation(accept_params)
          render json: auth_result(user)
        else
          unprocessable!(user)
        end
      rescue ActiveSupport::MessageVerifier::InvalidSignature, ActiveRecord::RecordNotFound
        invalid_token!
      end

      private

      def find_by_token!
        User.find_by_token_for!(:invitation, params[:token])
      end

      def invalid_token!
        render_error(:not_found, 'invalid_token', 'Nieprawidłowy lub wygasły token')
      end

      def accept_params
        params.permit(:password, :password_confirmation)
      end
    end
  end
end
