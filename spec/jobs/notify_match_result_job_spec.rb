# frozen_string_literal: true

require 'rails_helper'

RSpec.describe NotifyMatchResultJob do
  let(:sender) { instance_double(Typerek::Push::Send, call: true) }

  before { allow(Typerek::Push::Send).to receive(:new).and_return(sender) }

  it 'notifies every opted-in user that has a subscription' do
    match = create(:match, team_a: 'Polska', team_b: 'Niemcy', result_a: 2, result_b: 1)
    opted_in = create(:user, settings: { 'push_enabled' => true })
    create(:push_subscription, user: opted_in)
    # Opted out (no setting) and opted-in-but-no-device should both be skipped.
    create(:push_subscription, user: create(:user))
    create(:user, settings: { 'push_enabled' => true })

    described_class.new.perform(match.id)

    expect(Typerek::Push::Send).to have_received(:new).once.with(
      an_instance_of(PushSubscription),
      hash_including(title: 'Wpisano wynik meczu', url: "/matches/#{match.id}")
    )
  end

  it 'does nothing for a match without a final result' do
    match = create(:match, :without_results)
    create(:push_subscription, user: create(:user, settings: { 'push_enabled' => true }))

    described_class.new.perform(match.id)

    expect(Typerek::Push::Send).not_to have_received(:new)
  end

  it 'skips opted-in users who turned result notifications off' do
    match = create(:match, result_a: 1, result_b: 0)
    create(:push_subscription,
           user: create(:user, settings: { 'push_enabled' => true, 'push_results' => false }))

    described_class.new.perform(match.id)

    expect(Typerek::Push::Send).not_to have_received(:new)
  end
end
