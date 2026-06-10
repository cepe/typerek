# frozen_string_literal: true

# Forces the service worker entry point to always be revalidated, so a new deploy
# is picked up promptly instead of being pinned by a stale HTTP cache. Everything
# else under public/ (hashed JS/CSS, fonts, icons, the workbox-*.js chunk) is content
# addressed and stays immutable, so we leave those headers alone.
#
# Inserted at the top of the stack (above ActionDispatch::Static), it can adjust the
# response headers regardless of whether Rails or the static middleware served the file.
class ServiceWorkerCacheHeaders
  SW_PATH = '/sw.js'

  def initialize(app)
    @app = app
  end

  def call(env)
    status, headers, body = @app.call(env)
    if env['PATH_INFO'] == SW_PATH
      # Header names are case-insensitive on the wire, but Rack 3 normalizes to
      # lowercase. Drop whatever cache-control the static middleware emitted (any
      # case) before setting ours, so we never send a duplicate header.
      headers.delete_if { |k, _| k.casecmp('cache-control').zero? }
      headers['cache-control'] = 'public, max-age=0, must-revalidate'
    end
    [status, headers, body]
  end
end
