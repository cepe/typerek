# frozen_string_literal: true

module Api
  module V1
    # The `User` schema — a user as shown on the admin list.
    class UserSerializer
      def self.many(users)
        users.map { |user| call(user) }
      end

      def self.call(user)
        {
          id: user.id,
          username: user.username,
          admin: user.admin?,
          active: user.invitation_accepted_at.present?,
          fin: user.fin?,
          invited_by: user.invited_by_username
        }
      end
    end
  end
end