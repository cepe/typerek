# frozen_string_literal: true

# One Web Push (VAPID) subscription for a single browser/device. A user can hold
# several — one per device that opted in via Ustawienia. Rows are created through
# POST /api/v1/push/subscriptions and pruned automatically by Typerek::Push::Send
# when the push service reports the endpoint as gone (HTTP 404/410).
class PushSubscription < ApplicationRecord
  belongs_to :user

  validates :endpoint, presence: true, uniqueness: true
  validates :p256dh, :auth, presence: true
end