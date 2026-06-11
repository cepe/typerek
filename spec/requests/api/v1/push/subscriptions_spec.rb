# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'Api::V1::Push::Subscriptions', type: :request do
  let(:user) { create(:user) }

  def subscription_params(endpoint)
    { subscription: { endpoint: endpoint, keys: { p256dh: 'k', auth: 'a' } }, user_agent: 'rspec' }
  end

  describe 'GET /api/v1/push/subscriptions' do
    it "lists the current user's devices, newest first" do
      create(:push_subscription, user: user, endpoint: 'https://push.example.com/old', created_at: 2.days.ago)
      create(:push_subscription, user: user, endpoint: 'https://push.example.com/new', created_at: 1.hour.ago)
      create(:push_subscription, user: create(:user)) # another user's device — excluded

      get '/api/v1/push/subscriptions', headers: auth_headers(user)

      expect(response).to have_http_status(:ok)
      expect(json.map { |d| d['endpoint'] })
        .to eq(['https://push.example.com/new', 'https://push.example.com/old'])
      expect(json.first.keys).to contain_exactly('id', 'endpoint', 'user_agent', 'created_at')
    end
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

    it 'turns the account push_enabled flag on when the first device subscribes' do
      expect do
        post '/api/v1/push/subscriptions', params: subscription_params('https://push.example.com/abc'),
                                           headers: auth_headers(user)
      end.to change { user.reload.push_enabled? }.from(false).to(true)
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

    it 'turns push_enabled off when the last device unsubscribes' do
      create(:push_subscription, user: user, endpoint: 'https://push.example.com/abc')
      user.update_column(:settings, { 'push_enabled' => true })

      delete '/api/v1/push/subscriptions', params: { endpoint: 'https://push.example.com/abc' },
                                           headers: auth_headers(user)

      expect(user.reload.push_enabled?).to be(false)
    end

    it 'keeps push_enabled on while another device remains subscribed' do
      create(:push_subscription, user: user, endpoint: 'https://push.example.com/abc')
      create(:push_subscription, user: user, endpoint: 'https://push.example.com/def')
      user.update_column(:settings, { 'push_enabled' => true })

      delete '/api/v1/push/subscriptions', params: { endpoint: 'https://push.example.com/abc' },
                                           headers: auth_headers(user)

      expect(user.reload.push_enabled?).to be(true)
    end
  end
end
