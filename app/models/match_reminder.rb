# frozen_string_literal: true

# Records that a "you haven't bet this match yet" push reminder was sent to a user
# for a given window (hours before kickoff: 24, 6 or 1). Exists purely for
# idempotency so the hourly SendMatchRemindersJob never sends the same reminder
# twice, even across overlapping runs.
class MatchReminder < ApplicationRecord
  belongs_to :user
  belongs_to :match

  validates :window_hours, presence: true, uniqueness: { scope: %i[user_id match_id] }
end
