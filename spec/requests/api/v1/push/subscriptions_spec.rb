# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'Api::V1::Push::Subscriptions', type: :request do
  let(:user) { create(:user) }

  def subscription_params(endpoint)
    { subscription: { endpoint: endpoint, keys: { p256dh: 'k', auth: 'a' } }, user_agent: 'rspec' }
  end

  describe 'POST /api/v1/push/subscriptions' do
    it 'registers a new subscription for the current user' do
      expect do
        post '/api/v1/push/subscriptions', params: subscription_params('https://push.example.com/abc'),
                                           headers: auth_headers(user)
      end.to change(user.push_subscriptions, :count).by(1)

      expect(response).to have_http_status(:no_content)
    end

    it 'reassigns an endpoint already owned by another user to the current user' do
      other = create(:user)
      create(:push_subscription, user: other, endpoint: 'https://push.example.com/abc')

      post '/api/v1/push/subscriptions', params: subscription_params('https://push.example.com/abc'),
                                         headers: auth_headers(user)

      expect(PushSubscription.find_by(endpoint: 'https://push.example.com/abc').user).to eq(user)
    end

    it 'requires authentication' do
      post '/api/v1/push/subscriptions', params: subscription_params('https://push.example.com/abc')
      expect(response).to have_http_status(:unauthorized)
    end
  end

  describe 'DELETE /api/v1/push/subscriptions' do
    it "removes the current user's subscription for the given endpoint" do
      create(:push_subscription, user: user, endpoint: 'https://push.example.com/abc')

      expect do
        delete '/api/v1/push/subscriptions', params: { endpoint: 'https://push.example.com/abc' },
                                             headers: auth_headers(user)
      end.to change(user.push_subscriptions, :count).by(-1)

      expect(response).to have_http_status(:no_content)
    end
  end
end
