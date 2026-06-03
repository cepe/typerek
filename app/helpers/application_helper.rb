# frozen_string_literal: true

# Glowny helper aplikacji
module ApplicationHelper
  def user_status(user)
    if user.invitation_accepted_at.present?
      content_tag :span, 'aktywny', class: 'badge badge-success'
    else
      content_tag :span, 'zaproszony', class: 'badge badge-warning'
    end
  end

  def user_fin(user)
    klass = user.fin? ? 'badge badge-success cursor-pointer' : 'badge badge-danger cursor-pointer'
    content_tag :span, '$$$', class: klass
  end

  def reset_button
    content_tag :span, 'resetuj dostęp', class: 'badge badge-warning cursor-pointer'
  end

  def delete_button
    content_tag :span, 'usuń', class: 'badge badge-danger cursor-pointer'
  end
end
