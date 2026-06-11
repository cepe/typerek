# frozen_string_literal: true

require 'rails_helper'

RSpec.describe BroadcastPushJob do
  let(:sender) { instance_double(Typerek::Push::Send, call: true) }

  before { allow(Typerek::Push::Send).to receive(:new).and_return(sender) }

  it 'delivers to every opted-in user that has a subscription' do
    create(:push_subscription, user: create(:user, settings: { 'push_enabled' => true }))
    create(:push_subscription, user: create(:user, settings: { 'push_enabled' => true }))
    create(:push_subscription, user: create(:user)) # opted out — skipped

    described_class.new.perform(title: 'Cześć', body: 'Test')

    expect(Typerek::Push::Send).to have_received(:new).twice.with(
      an_instance_of(PushSubscription),
      hash_including(title: 'Cześć', body: 'Test')
    )
  end
end
