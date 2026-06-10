# frozen_string_literal: true

FactoryBot.define do
  factory :push_subscription do
    user
    sequence(:endpoint) { |n| "https://push.example.com/sub/#{n}" }
    p256dh { 'test-p256dh-key' }
    auth { 'test-auth-secret' }
  end
end
