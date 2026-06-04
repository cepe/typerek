# frozen_string_literal: true

FactoryBot.define do
  factory :user do
    username { Faker::Internet.username }
    password { Faker::Internet.password(min_length: 8) }

    trait :admin do
      admin { true }
    end

    trait :active do
      invitation_accepted_at { Time.current }
    end
  end
end
