# frozen_string_literal: true

module Api
  module V1
    class ProfileController < BaseController
      def show
        render json: CurrentUserSerializer.call(current_user)
      end

      def settings_stats
        render json: User.settings_counts
      end

      def update_settings
        # Persist only the settings bag, skipping validations: the User model
        # requires a password on every update (it is set during invitation
        # acceptance, never present here), which would otherwise reject this.
        current_user.settings = current_user.settings.merge(settings_params)
        current_user.save!(validate: false)
        # Return just the settings, not the full CurrentUser: flipping a switch
        # never moves the ranking, so there is no reason to pay for the ranking
        # query that CurrentUserSerializer runs. That query was making every save
        # take as long as GET /me.
        render json: { settings: current_user.settings_with_defaults }
      end

      private

      # Only known keys are accepted; values are coerced to booleans and merged
      # into the existing settings bag, so a partial update leaves the rest intact.
      def settings_params
        params.require(:settings).permit(:drzewko_mode, :bet_lock).to_h.transform_values do |value|
          ActiveModel::Type::Boolean.new.cast(value)
        end
      end
    end
  end
end