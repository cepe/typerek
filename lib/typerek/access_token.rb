# frozen_string_literal: true

module Typerek
  # Stateless access token (JWT, HS256) used by the /api/v1 API. Claims:
  #   sub   - user id
  #   admin - role (bool)
  #   exp   - expiry (Unix epoch)
  module AccessToken
    ALGORITHM = 'HS256'
    TTL = 24.hours

    module_function

    def encode(user, now: Time.current)
      payload = {
        sub: user.id,
        admin: user.admin?,
        exp: (now + TTL).to_i
      }
      JWT.encode(payload, secret, ALGORITHM)
    end

    # Returns the payload (Hash) for a valid, unexpired token, or nil.
    def decode(token)
      return nil if token.blank?

      payload, = JWT.decode(token, secret, true, algorithm: ALGORITHM)
      payload
    rescue JWT::DecodeError
      nil
    end

    def secret
      Rails.application.secret_key_base
    end
  end
end