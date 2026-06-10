# frozen_string_literal: true

module Typerek
  # Web Push (VAPID) configuration, read from the environment. The key pair is
  # generated once with `rake typerek:vapid_keys`; the public key is also handed to
  # the frontend build (VITE_VAPID_PUBLIC_KEY) so the browser can subscribe against
  # the same application server key.
  module Push
    module_function

    def vapid_details
      {
        subject: ENV.fetch('VAPID_SUBJECT', 'mailto:typerek@example.com'),
        public_key: ENV['VAPID_PUBLIC_KEY'],
        private_key: ENV['VAPID_PRIVATE_KEY']
      }
    end

    # Delivery is a no-op until both VAPID keys are set, so the app still boots and
    # serves traffic in environments that have not configured push yet.
    def configured?
      ENV['VAPID_PUBLIC_KEY'].present? && ENV['VAPID_PRIVATE_KEY'].present?
    end
  end
end