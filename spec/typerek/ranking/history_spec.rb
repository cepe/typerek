# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Typerek::Ranking::History do
  def active_user(username)
    create(:user, username: username, invitation_accepted_at: Time.current)
  end

  # Two chronological finished matches, team A wins both.
  let!(:match1) { create(:match, :winner_a, win_a: 3.0, start: 2.days.ago) }
  let!(:match2) { create(:match, :winner_a, win_a: 2.0, start: 1.day.ago) }

  describe '#call' do
    it 'returns matches in chronological order' do
      result = described_class.new.call
      expect(result.matches.map(&:id)).to eq([match1.id, match2.id])
    end

    it 'accumulates points across matches and records per-match positions' do
      amy = active_user('amy')
      bob = active_user('bob')

      # amy bets correctly on match1, bob does not
      create(:answer, match: match1, user: amy, result: :win_a)
      create(:answer, match: match1, user: bob, result: :tie)

      # both bet correctly on match2
      create(:answer, match: match2, user: amy, result: :win_a)
      create(:answer, match: match2, user: bob, result: :win_a)

      result = described_class.new.call
      amy_series = result.series.find { |s| s.user.username == 'amy' }
      bob_series = result.series.find { |s| s.user.username == 'bob' }

      # after match1: amy 3.0 pts (pos 1), bob 0.0 pts (pos 2)
      expect(amy_series.positions[0]).to eq(1)
      expect(amy_series.points[0]).to eq(3.0)
      expect(bob_series.positions[0]).to eq(2)
      expect(bob_series.points[0]).to eq(0.0)

      # after match2: amy 5.0 pts (pos 1), bob 2.0 pts (pos 2)
      expect(amy_series.positions[1]).to eq(1)
      expect(amy_series.points[1]).to eq(5.0)
      expect(bob_series.positions[1]).to eq(2)
      expect(bob_series.points[1]).to eq(2.0)
    end

    it 'assigns unique sequential positions (no shared positions even on equal points)' do
      amy = active_user('amy') # alphabetically first -> lower position number (higher rank)
      zoe = active_user('zoe')

      create(:answer, match: match1, user: amy, result: :win_a)
      create(:answer, match: match1, user: zoe, result: :win_a)

      result = described_class.new.call
      amy_series = result.series.find { |s| s.user.username == 'amy' }
      zoe_series = result.series.find { |s| s.user.username == 'zoe' }

      expect(amy_series.positions[0]).to eq(1)
      expect(zoe_series.positions[0]).to eq(2)
    end

    it 'excludes users who have not accepted their invitation' do
      active_user('amy')
      create(:user, username: 'pending', invitation_accepted_at: nil)

      result = described_class.new.call

      expect(result.series.map { |s| s.user.username }).to eq(%w[amy])
    end

    it 'recomputes fully when a match result is corrected' do
      amy = active_user('amy')
      bob = active_user('bob')

      create(:answer, match: match1, user: amy, result: :win_a) # 3.0 initially
      create(:answer, match: match1, user: bob, result: :tie)

      first_run = described_class.new.call
      amy_first = first_run.series.find { |s| s.user.username == 'amy' }
      expect(amy_first.positions[0]).to eq(1)

      # Correct the result: now it's a tie (both result_a and result_b = 0)
      match1.update!(result_a: 0, result_b: 0)

      second_run = described_class.new.call
      # After correction, amy's win_a bet no longer scores; bob's tie bet does
      amy_after = second_run.series.find { |s| s.user.username == 'amy' }
      bob_after  = second_run.series.find { |s| s.user.username == 'bob' }
      expect(amy_after.positions[0]).to eq(2)
      expect(bob_after.positions[0]).to eq(1)
    end

    it 'returns empty matches and series for active users when no matches are finished' do
      match1.update!(result_a: nil, result_b: nil)
      match2.update!(result_a: nil, result_b: nil)
      active_user('amy')

      result = described_class.new.call

      expect(result.matches).to be_empty
      expect(result.series.first.positions).to be_empty
    end
  end
end
