# frozen_string_literal: true

module Api
  module V1
    module Push
      # A browser/device registers or removes its own Web Push subscription. The
      # opt-in master switch (settings.push_enabled) is toggled separately through
      # PATCH /me/settings; this endpoint only manages the per-device endpoint rows.
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
            head :no_content
          else
            unprocessable!(record)
          end
        end

        # Remove this device's subscription (the browser also calls unsubscribe()).
        def destroy
          current_user.push_subscriptions.where(endpoint: params[:endpoint]).destroy_all
          head :no_content
        end
      end
    end
  end
end
