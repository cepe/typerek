# frozen_string_literal: true

module Typerek
  module Authenticate
    # Central authentication decision (username + password).
    # Used today by SessionsController and by the JWT login in Phase 1.
    # Maps to a future AuthenticationManager in Spring Security.
    class Handler
      def initialize(username:, password:)
        @username = username
        @password = password
      end

      # Returns the authenticated user, or nil.
      def call
        User.authenticate_by(username: @username, password: @password)
      end
    end
  end
end