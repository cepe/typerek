# frozen_string_literal: true

class ApplicationJob < ActiveJob::Base
  # Most jobs are safe to retry on a deadlock; Solid Queue handles backoff.
  # retry_on ActiveRecord::Deadlocked

  private

  # Fan a single notification out to every registered device of the given users.
  # `users` may be a relation or an array; only their stored subscriptions receive
  # the message, and Typerek::Push::Send prunes any that the push service rejects.
  def deliver_push(users, title:, body:, url: '/')
    PushSubscription.where(user: users).find_each do |subscription|
      Typerek::Push::Send.new(subscription, title: title, body: body, url: url).call
    end
  end
end
