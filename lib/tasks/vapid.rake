# frozen_string_literal: true

namespace :typerek do
  desc 'Generate a VAPID key pair for Web Push (copy the output into your env vars)'
  task vapid_keys: :environment do
    require 'web_push'
    key = WebPush.generate_key

    puts 'Backend (.env / deploy secrets):'
    puts "VAPID_PUBLIC_KEY=#{key.public_key}"
    puts "VAPID_PRIVATE_KEY=#{key.private_key}"
    puts 'VAPID_SUBJECT=mailto:you@example.com'
    puts
    puts 'Frontend build (frontend/.env):'
    puts "VITE_VAPID_PUBLIC_KEY=#{key.public_key}"
  end
end