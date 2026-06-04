# frozen_string_literal: true

module Api
  module V1
    class UsersController < BaseController
      def index
        authorize! :manage, User
        render json: UserSerializer.many(User.includes(:invited_by).order(:username))
      end

      def create
        authorize! :manage, User
        user = Typerek::CreateInvitation::Handler.new(
          username: params[:username],
          invited_by: current_user
        ).call

        if user.persisted?
          render json: invitation_for(user), status: :created
        else
          unprocessable!(user)
        end
      end

      # Any signed-in user can view another participant's profile (their bets on
      # matches that have already started).
      def show
        user = User.find(params[:id])
        render json: UserProfileSerializer.call(user, started_matches: Match.started.includes(:answers))
      end

      def destroy
        authorize! :manage, User
        user = User.find(params[:id])
        if user.destroy
          head :no_content
        else
          unprocessable!(user)
        end
      end

      def resend_invitation
        authorize! :manage, User
        user = User.find(params[:id])
        render json: invitation_for(user)
      end

      def fin
        authorize! :manage, User
        user = User.find(params[:id])
        user.toggle!(:fin)
        render json: UserSerializer.call(user)
      end

      private

      def invitation_for(user)
        token = user.generate_token_for(:invitation)
        InvitationSerializer.created(user, token: token, url: accept_url(token))
      end

      # Activation link the frontend will handle (SPA route). Served from the
      # same origin in Phase 3.
      def accept_url(token)
        "#{request.base_url}/invitations/#{token}"
      end
    end
  end
end