# frozen_string_literal: true

module Api
  module V1
    # A registered Web Push device for the signed-in user. `endpoint` lets the client
    # tell which row is the current browser; `user_agent` is parsed into a friendly
    # name client-side (frontend/src/pages/SettingsPage.tsx).
    class PushSubscriptionSerializer
      def self.many(subscriptions)
        subscriptions.map { |subscription| call(subscription) }
      end

      def self.call(subscription)
        {
          id: subscription.id,
          endpoint: subscription.endpoint,
          user_agent: subscription.user_agent,
          created_at: subscription.created_at&.utc&.iso8601
        }
      end
    end
  end
end
