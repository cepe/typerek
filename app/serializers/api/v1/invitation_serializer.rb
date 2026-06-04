# frozen_string_literal: true

module Api
  module V1
    # Invitation schemas: `InvitationCreated` (after create/resend) and
    # `InvitationInfo` (token validation).
    class InvitationSerializer
      def self.created(user, token:, url:)
        {
          user: UserSerializer.call(user),
          token: token,
          url: url
        }
      end

      def self.info(user)
        { username: user.username }
      end
    end
  end
end