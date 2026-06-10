# frozen_string_literal: true

require 'web_push'

module Typerek
  module Push
    # Delivers a single Web Push message to one subscription. The payload is the JSON
    # shape the service worker's `push` handler expects ({ title, body, url }). When
    # the push service reports the endpoint as gone, the subscription is destroyed so
    # dead devices don't accumulate; any other error propagates to the caller/job.
    class Send
      # How long (seconds) the push service should keep retrying delivery to an
      # offline device before dropping the message.
      TTL = 24 * 60 * 60

      def initialize(subscription, title:, body:, url: '/')
        @subscription = subscription
        @title = title
        @body = body
        @url = url
      end

      # Returns true when the push service accepted the message, false when the
      # subscription was expired/invalid (and has been removed).
      def call
        return false unless Typerek::Push.configured?

        WebPush.payload_send(
          message: JSON.generate(title: @title, body: @body, url: @url),
          endpoint: @subscription.endpoint,
          p256dh: @subscription.p256dh,
          auth: @subscription.auth,
          vapid: Typerek::Push.vapid_details,
          ttl: TTL,
          urgency: 'normal'
        )
        true
      rescue WebPush::ExpiredSubscription, WebPush::InvalidSubscription
        @subscription.destroy
        false
      end
    end
  end
end