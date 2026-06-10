# frozen_string_literal: true

require 'rails_helper'

RSpec.describe SendMatchRemindersJob do
  let!(:user) { create(:user, settings: { 'push_enabled' => true }) }
  let!(:subscription) { create(:push_subscription, user: user) }
  let(:sender) { instance_double(Typerek::Push::Send, call: true) }

  before { allow(Typerek::Push::Send).to receive(:new).and_return(sender) }

  it 'reminds an opted-in user about an unbet match entering the 24h window' do
    create(:match, :without_results, start: 23.hours.from_now)

    described_class.new.perform

    expect(Typerek::Push::Send).to have_received(:new).once
    expect(MatchReminder.pluck(:window_hours)).to contain_exactly(24)
  end

  it 'is idempotent: a second run within the same window does not resend' do
    create(:match, :without_results, start: 23.hours.from_now)

    described_class.new.perform
    described_class.new.perform

    expect(Typerek::Push::Send).to have_received(:new).once
  end

  it 'does not remind a user who already bet the match' do
    match = create(:match, :without_results, start: 23.hours.from_now)
    create(:answer, match: match, user: user)

    described_class.new.perform

    expect(Typerek::Push::Send).not_to have_received(:new)
  end

  it 'does not remind users who have not opted in' do
    user.update_column(:settings, { 'push_enabled' => false })
    create(:match, :without_results, start: 23.hours.from_now)

    described_class.new.perform

    expect(Typerek::Push::Send).not_to have_received(:new)
  end

  it 'does not remind opted-in users who turned reminders off' do
    user.update_column(:settings, { 'push_enabled' => true, 'push_reminders' => false })
    create(:match, :without_results, start: 23.hours.from_now)

    described_class.new.perform

    expect(Typerek::Push::Send).not_to have_received(:new)
  end

  it 'records every crossed window at once for a late-added match (no later 24h ping)' do
    create(:match, :without_results, start: 5.hours.from_now)

    described_class.new.perform

    # 5h before kickoff crosses both 24h and 6h; only the closest (6h) is announced.
    expect(Typerek::Push::Send).to have_received(:new).once
    expect(MatchReminder.pluck(:window_hours)).to contain_exactly(24, 6)
  end

  it 'ignores matches that have already started' do
    create(:match, :without_results, start: 30.minutes.ago)

    described_class.new.perform

    expect(Typerek::Push::Send).not_to have_received(:new)
  end

  it 'sends a fresh reminder when a closer window is crossed later' do
    match = create(:match, :without_results, start: 23.hours.from_now)

    described_class.new.perform # 24h window
    match.update_column(:start, 50.minutes.from_now)
    described_class.new.perform # 1h window (6h was skipped over, only closest sent)

    expect(Typerek::Push::Send).to have_received(:new).twice
    expect(MatchReminder.pluck(:window_hours)).to contain_exactly(24, 6, 1)
  end
end
