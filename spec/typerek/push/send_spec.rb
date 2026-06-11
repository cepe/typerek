# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Typerek::Push::Send do
  # let! (not let) so the row exists before the prune example's `change` block measures.
  let!(:subscription) { create(:push_subscription) }

  describe '#call' do
    context 'when push is not configured' do
      before { allow(Typerek::Push).to receive(:configured?).and_return(false) }

      it 'does not attempt delivery and returns false' do
        expect(WebPush).not_to receive(:payload_send)
        expect(described_class.new(subscription, title: 'T', body: 'B').call).to be(false)
      end
    end

    context 'when configured' do
      before do
        allow(Typerek::Push).to receive(:configured?).and_return(true)
        allow(Typerek::Push).to receive(:vapid_details)
          .and_return(subject: 'mailto:x@example.com', public_key: 'pub', private_key: 'priv')
      end

      it 'sends the JSON payload to the subscription and returns true' do
        expect(WebPush).to receive(:payload_send).with(
          hash_including(
            endpoint: subscription.endpoint,
            p256dh: subscription.p256dh,
            auth: subscription.auth,
            message: JSON.generate(title: 'Wynik', body: 'Gol', url: '/matches/1')
          )
        )

        result = described_class.new(subscription, title: 'Wynik', body: 'Gol', url: '/matches/1').call
        expect(result).to be(true)
      end

      it 'prunes the subscription when the push service reports it expired' do
        # Build without the constructor so we don't depend on its arity/internals.
        allow(WebPush).to receive(:payload_send).and_raise(WebPush::ExpiredSubscription.allocate)

        expect { described_class.new(subscription, title: 'T', body: 'B').call }
          .to change(PushSubscription, :count).by(-1)
      end
    end
  end
end
