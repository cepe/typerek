# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Typerek::Ranking::Query do
  # A finished match where team A won, with a known payout for the "1" (win_a) bet.
  let(:match) { create(:match, :start_in_past, :winner_a, win_a: 5.0) }

  def active_user(username)
    create(:user, username: username, invitation_accepted_at: Time.current)
  end

  describe '#call' do
    it 'orders active users by points desc, breaking ties by username, with shared positions' do
      zoe = active_user('zoe')   # 5.0 pts
      amy = active_user('amy')   # 5.0 pts (tie with zoe -> username breaks it)
      bob = active_user('bob')   # 0.0 pts
      create(:answer, match: match, user: zoe, result: :win_a)
      create(:answer, match: match, user: amy, result: :win_a)
      create(:answer, match: match, user: bob, result: :tie)

      result = described_class.new.call

      expect(result.map { |entry| entry.user.username }).to eq(%w[amy zoe bob])
      expect(result.map(&:points)).to eq([5.0, 5.0, 0.0])
      expect(result.map(&:position)).to eq([1, 1, 3])
    end

    it 'exposes accuracy (number of scoring bets)' do
      amy = active_user('amy')
      create(:answer, match: match, user: amy, result: :win_a)

      entry = described_class.new.call.first

      expect(entry.accuracy).to eq(1)
    end

    it 'leaves previous_position nil until a second match has finished' do
      amy = active_user('amy')
      create(:answer, match: match, user: amy, result: :win_a)

      entry = described_class.new.call.first

      expect(entry.previous_position).to be_nil
    end

    it 'exposes the position before the most recent finished match as previous_position' do
      earlier = create(:match, :winner_a, win_a: 6.0, start: 2.days.ago)
      latest  = create(:match, :winner_a, win_a: 10.0, start: 1.day.ago)
      amy = active_user('amy') # misses the earlier one, nails the latest -> 10.0
      bob = active_user('bob') # nails the earlier one, misses the latest -> 6.0
      create(:answer, match: earlier, user: amy, result: :tie)
      create(:answer, match: latest,  user: amy, result: :win_a)
      create(:answer, match: earlier, user: bob, result: :win_a)
      create(:answer, match: latest,  user: bob, result: :tie)

      result = described_class.new.call
      amy_entry = result.find { |entry| entry.user == amy }
      bob_entry = result.find { |entry| entry.user == bob }

      # After both matches amy leads; before the latest match bob was ahead.
      expect([amy_entry.position, bob_entry.position]).to eq([1, 2])
      expect([amy_entry.previous_position, bob_entry.previous_position]).to eq([2, 1])
    end

    it 'excludes users who have not accepted their invitation' do
      active_user('amy')
      create(:user, username: 'pending', invitation_accepted_at: nil)

      result = described_class.new.call

      expect(result.map { |entry| entry.user.username }).to eq(%w[amy])
    end
  end

  describe '#entry_for' do
    it 'returns the standing entry for the given user' do
      amy = active_user('amy')

      entry = described_class.new.entry_for(amy)

      expect(entry.user).to eq(amy)
      expect(entry.position).to eq(1)
    end

    it 'returns nil for a user outside the ranking' do
      active_user('amy')
      pending = create(:user, username: 'pending', invitation_accepted_at: nil)

      expect(described_class.new.entry_for(pending)).to be_nil
    end
  end

  describe '.standing_for' do
    it 'returns the position and points for the given user' do
      zoe = active_user('zoe')
      amy = active_user('amy')
      create(:answer, match: match, user: zoe, result: :win_a)

      expect(described_class.standing_for(zoe)).to eq(position: 1, points: 5.0)
      expect(described_class.standing_for(amy)).to eq(position: 2, points: 0.0)
    end

    it 'returns nil for a user outside the ranking' do
      active_user('amy')
      pending = create(:user, username: 'pending', invitation_accepted_at: nil)

      expect(described_class.standing_for(pending)).to be_nil
    end
  end
end