# frozen_string_literal: true

module Api
  module V1
    module Push
      # A browser/device registers or removes its own Web Push subscription. Opt-in is
      # per-device (one endpoint row each); the account-wide settings.push_enabled flag
      # that gates sending is derived here — on whenever the user has at least one
      # device subscribed, off once the last one leaves.
      class SubscriptionsController < BaseController
        # Body is the browser's PushSubscription JSON:
        #   { subscription: { endpoint, keys: { p256dh, auth } }, user_agent }
        # Keyed on the (globally unique) endpoint and reassigned to the current user,
        # so re-subscribing or logging in as someone else on the same device just
        # moves the device's subscription rather than colliding on the unique index.
        def create
          sub = params.require(:subscription)
          keys = sub[:keys] || {}

          record = PushSubscription.find_or_initialize_by(endpoint: sub[:endpoint])
          record.assign_attributes(
            user: current_user,
            p256dh: keys[:p256dh],
            auth: keys[:auth],
            user_agent: params[:user_agent]
          )

          if record.save
            sync_push_enabled!
            head :no_content
          else
            unprocessable!(record)
          end
        end

        # Remove this device's subscription (the browser also calls unsubscribe()).
        def destroy
          current_user.push_subscriptions.where(endpoint: params[:endpoint]).destroy_all
          sync_push_enabled!
          head :no_content
        end

        private

        # Keep the account-wide opt-in flag in step with whether any device is
        # subscribed. update_column (like ProfileController) so it never bumps
        # updated_at and busts the ranking cache.
        def sync_push_enabled!
          desired = current_user.push_subscriptions.exists?
          return if current_user.push_enabled? == desired

          current_user.update_column(:settings, current_user.settings.merge('push_enabled' => desired))
        end
      end
    end
  end
end
