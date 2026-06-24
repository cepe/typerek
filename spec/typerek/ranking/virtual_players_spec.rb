# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Typerek::Ranking::VirtualPlayers do
  describe '#call' do
    it 'scores the favourite, underdog and draw strategies over finished matches' do
      # Team A won. win_a (1.5) is the favourite, win_b (4.0) the underdog; a draw bet
      # loses. Only the favourite scores, earning win_a's odds.
      create(:match, :start_in_past, :winner_a, win_a: 1.5, win_b: 4.0, tie: 3.0)

      result = described_class.call

      by_key = result.index_by { |row| row[:key] }
      expect(by_key['favourite']).to include(username: 'Faworyt', points: 1.5, accuracy: 1)
      expect(by_key['underdog']).to include(username: 'Underdog', points: 0.0, accuracy: 0)
      expect(by_key['draw']).to include(username: 'Remis', points: 0.0, accuracy: 0)
    end

    it 'backs the higher-odds side as the underdog when it wins' do
      # Team B won and was the underdog (win_b 4.0 > win_a 1.5), so the underdog scores.
      create(:match, :start_in_past, :winner_b, win_a: 1.5, win_b: 4.0)

      by_key = described_class.call.index_by { |row| row[:key] }

      expect(by_key['underdog']).to include(points: 4.0, accuracy: 1)
      expect(by_key['favourite']).to include(points: 0.0, accuracy: 0)
    end

    it 'scores the draw strategy when the match is a tie' do
      create(:match, :start_in_past, :tie, tie: 3.0)

      by_key = described_class.call.index_by { |row| row[:key] }

      expect(by_key['draw']).to include(points: 3.0, accuracy: 1)
    end

    it 'accumulates across matches and returns rows ordered by points desc' do
      create(:match, :start_in_past, :winner_a, win_a: 2.0, win_b: 5.0)
      create(:match, :start_in_past, :winner_b, win_a: 1.5, win_b: 6.0)

      result = described_class.call

      # favourite: hits match 1 only (2.0); underdog: hits match 2 only (6.0); draw: 0.
      expect(result.map { |row| row[:key] }).to eq(%w[underdog favourite draw])
      expect(result.map { |row| row[:points] }).to eq([6.0, 2.0, 0.0])
    end

    it 'ignores matches that have not finished' do
      create(:match, :start_in_future, :without_results, win_a: 1.5, win_b: 4.0)

      result = described_class.call

      expect(result.map { |row| row[:points] }).to all(eq(0.0))
    end
  end
end
