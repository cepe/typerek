# frozen_string_literal: true

# Serves the built React single-page app (frontend/dist, copied into public/ by the
# Docker build). Every non-API browser route falls back here so the client-side
# router can take over. No auth filters — authentication happens in the SPA via the
# JWT API.
class SpaController < ActionController::Base
  INDEX = Rails.root.join('public/index.html')

  def index
    if File.exist?(INDEX)
      response.headers['Cache-Control'] = 'no-cache' # always revalidate the shell; assets are hashed
      send_file INDEX, type: 'text/html', disposition: 'inline'
    else
      render plain: 'Frontend not built. Run `cd frontend && npm run build`, or use the Vite dev server.',
             status: :not_found
    end
  end
end
