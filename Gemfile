# frozen_string_literal: true

source 'https://rubygems.org'

ruby '3.3.6'

gem 'bcrypt'
gem 'bootsnap', require: false
gem 'cancancan'
gem 'jwt'
gem 'pg'
gem 'puma'
gem 'rails', '~> 7.1.0'
gem 'rails-i18n', '~> 7.0'
# DB-backed Active Job queue (no Redis). Runs inside Puma via its plugin; powers the
# match-reminder recurring job and off-request push delivery.
gem 'solid_queue', '~> 1.1'
# Web Push (VAPID) delivery to browser/PWA push services. `require: web_push` because
# the gem's load path uses an underscore while the gem name uses a hyphen.
gem 'web-push', require: 'web_push'

group :development, :test do
  gem 'factory_bot_rails'
  gem 'faker'
  gem 'rspec-rails'
  gem 'rubocop'
  gem 'rubocop-rails', require: false
end
