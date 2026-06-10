# frozen_string_literal: true

require_relative 'boot'

require 'rails/all'

# Require the gems listed in Gemfile, including any gems
# you've limited to :test, :development, or :production.
Bundler.require(*Rails.groups)

# Middleware must be a stable (non-reloadable) constant available before the stack is
# built, so it's required here rather than autoloaded from app/. See the class comment.
require_relative '../lib/middleware/service_worker_cache_headers'

module Typerek
  class Application < Rails::Application
    # Initialize configuration defaults for originally generated Rails version.
    config.load_defaults 7.1

    # Please, add to the `ignore` list any other `lib` subdirectories that do
    # not contain `.rb` files, or that should not be reloaded or eager loaded.
    # Common ones are `templates`, `generators`, or `middleware`, for example.
    config.autoload_lib(ignore: %w[assets tasks middleware])

    # Configuration for the application, engines, and railties goes here.
    #
    # These settings can be overridden in specific environments using the files
    # in config/environments, which are processed later.
    #
    config.time_zone = "Europe/Warsaw"
    config.i18n.default_locale = :pl

    # Keep the PWA service worker (public/sw.js) out of the HTTP cache so clients pick
    # up new deploys quickly. Inserted at the top so it sits above ActionDispatch::Static.
    config.middleware.insert_before(0, ServiceWorkerCacheHeaders)
  end
end
