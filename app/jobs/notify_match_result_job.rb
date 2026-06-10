# frozen_string_literal: true

# Notification #1: a match result was entered and the ranking changed. Enqueued from
# MatchesController#update the moment a match transitions to finished. Goes to every
# opted-in user (the ranking concerns everyone, and non-bettors learn they missed it).
class NotifyMatchResultJob < ApplicationJob
  queue_as :default

  def perform(match_id)
    match = Match.find_by(id: match_id)
    return unless match&.finished?

    deliver_push(
      User.push_results_enabled,
      title: 'Wpisano wynik meczu',
      body: "#{match.team_a} #{match.result_a}–#{match.result_b} #{match.team_b}. Ranking zaktualizowany.",
      url: "/matches/#{match.id}"
    )
  end
end
