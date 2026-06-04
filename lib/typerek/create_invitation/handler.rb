# frozen_string_literal: true

module Typerek
  module CreateInvitation
    # Creates an invited user account (without a password — it is set on
    # acceptance). Returns the user; if the save failed the object is not
    # persisted (`persisted? == false`) and carries validation errors.
    class Handler
      def initialize(username:, invited_by:)
        @username = username
        @invited_by = invited_by
      end

      def call
        user = User.new(username: @username, invited_by: @invited_by)
        user.save
        user
      end
    end
  end
end