# frozen_string_literal: true

# Glowny helper aplikacji
module ApplicationHelper
  # Points formatted for display: 2 decimals, trailing zeros stripped (98.20 -> 98.2).
  def points_display(value)
    number_with_precision(value, precision: 2, strip_insignificant_zeros: true)
  end

  # Current user's standing (rank + points) for the header. Computed once per request.
  # Delegates to Typerek::Ranking so ranking logic lives in one place.
  def current_user_standing
    return @current_user_standing if defined?(@current_user_standing)

    user = Current.user
    return @current_user_standing = nil unless user

    entry = Typerek::Ranking::Query.new.entry_for(user)
    @current_user_standing = entry && { rank: entry.position, points: entry.points }
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
      content_tag :span, safe_join([tag.i(class: 'fa fa-check'), ' potwierdzony']), class: 'badge badge-success cursor-pointer'
    else
      content_tag :span, safe_join([tag.i(class: 'fa fa-times'), ' niepotwierdzony']), class: 'badge badge-danger cursor-pointer'
    end
  end
end
