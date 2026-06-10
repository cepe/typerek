# frozen_string_literal: true

# Admin-triggered broadcast: send an arbitrary notification to every opted-in user.
# Enqueued from Api::V1::Push::BroadcastsController; used for announcements and for
# testing the full delivery path.
class BroadcastPushJob < ApplicationJob
  queue_as :default

  def perform(title:, body:, url: '/')
    deliver_push(User.push_enabled, title: title, body: body, url: url)
  end
end
