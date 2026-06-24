# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Match, type: :model do
  describe '.future' do
    let!(:past_match) { create(:match, :start_in_past, :winner_a) }
    let!(:current_match) { create(:match, :start_in_past, :without_results) }
    let!(:future_match) { create(:match, :start_in_future, :without_results) }

    it 'returns list of finished matches' do
      expect(described_class.future).to match_array(future_match)
    end
  end

  describe '#started?' do
    context 'when there is no start time defined' do
      subject(:match) { described_class.new(start: nil) }

      it { expect(match.started?).to eq(false) }
    end

    context 'when there is start time defined in future' do
      subject(:match) { described_class.new(start: 1.minute.from_now) }

      it { expect(match.started?).to eq(false) }
    end

    context 'when there is start time defined in past' do
      subject(:match) { described_class.new(start: 1.minute.ago) }

      it { expect(match.started?).to eq(true) }
    end
  end

  describe '#winning_list' do
    context 'when there is no result_a' do
      subject(:match) { described_class.new(result_a: nil) }

      it { expect(match.winning_list).to eq([]) }
    end

    context 'when there is no result_b' do
      subject(:match) { described_class.new(result_b: nil) }

      it { expect(match.winning_list).to eq([]) }
    end

    context 'when there is result_a > result_b' do
      subject(:match) { described_class.new(result_a: 1, result_b: 0) }

      it { expect(match.winning_list).to eq(%w[win_a win_tie_a not_tie]) }
    end

    context 'when there is result_a < result_b' do
      subject(:match) { described_class.new(result_a: 0, result_b: 1) }

      it { expect(match.winning_list).to eq(%w[win_b win_tie_b not_tie]) }
    end

    context 'when there is result_a = result_b' do
      subject(:match) { described_class.new(result_a: 0, result_b: 0) }

      it { expect(match.winning_list).to eq(%w[tie win_tie_a win_tie_b]) }
    end
  end

  describe '#max_point' do
    it 'is the best odds among the winning outcomes' do
      match = described_class.new(result_a: 1, result_b: 0, win_a: 5.0, win_tie_a: 1.5, not_tie: 1.2)

      expect(match.max_point).to eq(5.0)
    end

    it 'ignores odds of outcomes that did not win' do
      # A draw, so only tie / win_tie_a / win_tie_b score — win_a's high odds are out.
      match = described_class.new(result_a: 0, result_b: 0, win_a: 9.9, tie: 3.0, win_tie_a: 1.4, win_tie_b: 1.6)

      expect(match.max_point).to eq(3.0)
    end

    it 'is zero while the match is unfinished' do
      match = described_class.new(result_a: nil, result_b: nil, win_a: 5.0)

      expect(match.max_point).to eq(0.0)
    end

    it 'is zero when none of the winning outcomes has odds set' do
      match = described_class.new(result_a: 1, result_b: 0, win_a: nil, win_tie_a: nil, not_tie: nil)

      expect(match.max_point).to eq(0.0)
    end
  end

  describe '.perfect_score' do
    it 'sums the best obtainable points across finished matches only' do
      create(:match, :start_in_past, :winner_a, win_a: 5.0, win_tie_a: 1.5, not_tie: 1.2)
      create(:match, :start_in_past, :tie, tie: 3.0, win_tie_a: 1.4, win_tie_b: 1.6)
      create(:match, :start_in_future, :without_results, win_a: 9.9)

      expect(described_class.perfect_score).to eq(8.0)
    end

    it 'is zero when nothing has finished' do
      create(:match, :start_in_future, :without_results)

      expect(described_class.perfect_score).to eq(0.0)
    end
  end
end
