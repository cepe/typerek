# frozen_string_literal: true

# Notification #2: remind opted-in users about matches they haven't bet on yet, as
# kickoff approaches. Runs every 15 minutes (config/recurring.yml). For each upcoming
# match it announces the closest window that has just been crossed — 24h, then 6h, then
# 1h before kickoff — sending at most one push per user per window. The match_reminders
# table makes that idempotent, so overlapping runs never double-send.
class SendMatchRemindersJob < ApplicationJob
  queue_as :default

  # Windows in hours before kickoff. A match "enters" window W once it starts within
  # W hours; the smallest entered-but-unsent window is the one we announce.
  WINDOWS = [24, 6, 1].freeze

  def perform
    now = Time.current
    # Only matches that haven't started yet and kick off within the largest window.
    Match.where(start: now..(now + WINDOWS.max.hours)).find_each do |match|
      remind_for(match, now)
    end
  end

  private

  def remind_for(match, now)
    hours_to_kickoff = (match.start - now) / 1.hour
    entered = WINDOWS.select { |w| hours_to_kickoff <= w }
    return if entered.empty?

    # The closest crossed window is what we tell the user about. Because every send
    # records *all* currently-entered windows at once, a user either already has this
    # window recorded (covered — skip) or none of the new ones (notify now).
    target = entered.min

    recipients = User.push_reminders_enabled
                     .where.not(id: match.answers.select(:user_id))
                     .where.not(id: MatchReminder.where(match: match, window_hours: target).select(:user_id))
                     .to_a # materialise before we insert reminder rows below
    return if recipients.empty?

    recipients.each do |user|
      entered.each do |window|
        MatchReminder.create_or_find_by(user_id: user.id, match_id: match.id, window_hours: window)
      end
    end

    deliver_push(
      recipients,
      title: 'Niewytypowany mecz',
      body: reminder_body(match, target),
      url: "/matches/#{match.id}"
    )
  end

  def reminder_body(match, window_hours)
    when_text = case window_hours
                when 1 then 'za godzinę'
                when 6 then 'za 6 godzin'
                else 'za 24 godziny'
                end
    "#{match.team_a} – #{match.team_b} zaczyna się #{when_text}, a nie masz typu!"
  end
end
