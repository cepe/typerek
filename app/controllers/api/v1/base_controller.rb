# frozen_string_literal: true

module Api
  module V1
    # Shared base for the API controllers: JWT (Bearer) authentication, CanCan
    # authorization and a consistent JSON error shape. No session and no CSRF —
    # the API is stateless.
    class BaseController < ActionController::API
      include CanCan::ControllerAdditions

      before_action :authenticate!

      rescue_from CanCan::AccessDenied, with: :forbidden!
      rescue_from ActiveRecord::RecordNotFound, with: :not_found!

      attr_reader :current_user

      private

      def authenticate!
        payload = Typerek::AccessToken.decode(bearer_token)
        @current_user = User.find_by(id: payload['sub']) if payload
        unauthorized! unless @current_user
      end

      def bearer_token
        request.authorization.to_s.split(' ').last
      end

      def current_ability
        @current_ability ||= Ability.new(current_user)
      end

      # Shared response shape for login / invitation acceptance (AuthResult).
      def auth_result(user)
        {
          token: Typerek::AccessToken.encode(user),
          user: CurrentUserSerializer.call(user)
        }
      end

      # ── Consistent error responses ─────────────────────────────────────────
      def render_error(status, code, message, fields: nil)
        error = { code: code, message: message }
        error[:fields] = fields if fields
        render json: { error: error }, status: status
      end

      def unauthorized!
        render_error(:unauthorized, 'unauthorized', 'Wymagane uwierzytelnienie')
      end

      def forbidden!(_exception = nil)
        render_error(:forbidden, 'forbidden', 'Brak uprawnień')
      end

      def not_found!(_exception = nil)
        render_error(:not_found, 'not_found', 'Nie znaleziono zasobu')
      end

      # Accepts an AR record (builds per-field validation errors) or a ready message.
      def unprocessable!(record_or_message)
        if record_or_message.respond_to?(:errors)
          render_error(:unprocessable_entity, 'validation_failed',
                       record_or_message.errors.full_messages.to_sentence,
                       fields: record_or_message.errors.to_hash)
        else
          render_error(:unprocessable_entity, 'unprocessable', record_or_message.to_s)
        end
      end
    end
  end
end