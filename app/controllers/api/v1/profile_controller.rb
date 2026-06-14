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
        # Write the settings bag straight to its column with update_column. This
        # skips validations (the User model demands a password on every save, never
        # present here) and — crucially — does NOT bump updated_at. The ranking
        # cache is fingerprinted on User.maximum(:updated_at), so a plain save here
        # would invalidate it on every toggle and make the next GET /me recompute
        # the whole ranking. A setting never affects the ranking, so it must not
        # touch that fingerprint.
        current_user.update_column(:settings, current_user.settings.merge(settings_params))
        # Return just the settings, not the full CurrentUser: flipping a switch
        # never moves the ranking, so there is no reason to pay for the ranking
        # query that CurrentUserSerializer runs.
        render json: { settings: current_user.settings_with_defaults }
      end

      private

      # Only known keys are accepted; values are coerced to booleans and merged
      # into the existing settings bag, so a partial update leaves the rest intact.
      def settings_params
        params.require(:settings).permit(
          :drzewko_mode, :bet_lock, :hide_odds, :hide_double_chance,
          :push_enabled, :push_results, :push_reminders
        ).to_h.transform_values do |value|
          ActiveModel::Type::Boolean.new.cast(value)
        end
      end
    end
  end
end