# frozen_string_literal: true

# Glowny helper aplikacji
module ApplicationHelper
  # Points formatted for display: 2 decimals, trailing zeros stripped (98.20 -> 98.2).
  def points_display(value)
    number_with_precision(value, precision: 2, strip_insignificant_zeros: true)
  end

  # Current user's standing (rank + points) for the header. Computed once per request.
  # Ties share a rank, matching RankingsController.
  def current_user_standing
    return @current_user_standing if defined?(@current_user_standing)

    user = Current.user
    return @current_user_standing = nil unless user

    points_by_id = User.active.includes(answers: :match).to_h { |u| [u.id, u.points] }
    mine = points_by_id[user.id] || user.points
    rank = points_by_id.values.sort.reverse.index(mine)
    @current_user_standing = { rank: rank ? rank + 1 : nil, points: mine }
  end

  def user_status(user)
    if user.invitation_accepted_at.present?
      content_tag :span, 'aktywny', class: 'badge badge-success'
    else
      content_tag :span, 'zaproszony', class: 'badge badge-warning'
    end
  end

  def user_fin(user)
    if user.fin?
      content_tag :span, safe_join([tag.i(class: 'fa fa-check'), ' Opłacone']), class: 'badge badge-success cursor-pointer'
    else
      content_tag :span, safe_join([tag.i(class: 'fa fa-times'), ' Nieopłacone']), class: 'badge badge-danger cursor-pointer'
    end
  end
end
