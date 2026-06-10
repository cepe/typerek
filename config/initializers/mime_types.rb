# frozen_string_literal: true
# Be sure to restart your server when you modify this file.

# Add new mime types for use in respond_to blocks:
# Mime::Type.register "text/richtext", :rtf

# The static middleware serves the PWA manifest (public/manifest.webmanifest) by
# extension. Rack doesn't know `.webmanifest`, so register it or it goes out as
# text/plain. (This is Rack::Mime, separate from Rails' Mime::Type above.)
Rack::Mime::MIME_TYPES['.webmanifest'] = 'application/manifest+json'
