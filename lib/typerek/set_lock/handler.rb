# frozen_string_literal: true

module Typerek
  module SetLock
    # Locks or unlocks the user's existing bet on a match so it can't be changed
    # by accident. A locked bet is rejected by MakeBet::Handler.
    class Handler
      def initialize(match_id:, user_id:, locked:)
        @match_id = match_id
        @user_id = user_id
        @locked = ActiveModel::Type::Boolean.new.cast(locked)
      end

      def call
        raise MatchNotFoundError, 'Mecz nie został znaleziony.' unless match
        raise UserNotFoundError, 'Użytkownik nie został znaleziony.' unless user
        raise MatchAlreadyStartedError, 'Mecz już się rozpoczął.' if match.started?

        answer = match.answers.find_by(user_id: user.id)
        raise Error, 'Najpierw zatypuj mecz.' unless answer

        answer.update!(locked: @locked)
        answer
      end

      private

      def match
        @match ||= Match.find_by(id: @match_id)
      end

      def user
        @user ||= User.find_by(id: @user_id)
      end
    end
  end
end
