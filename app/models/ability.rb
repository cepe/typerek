# frozen_string_literal: true

class Ability
  include CanCan::Ability

  def initialize(user)
    # If the user is not logged in, they have no permissions
    return unless user

    # Every logged-in user can view matches
    can :read, Match

    return unless user.admin?

    # Only the administrator can manage matches
    can :manage, Match
    # Only the administrator can manage users
    can :manage, User
  end
end
