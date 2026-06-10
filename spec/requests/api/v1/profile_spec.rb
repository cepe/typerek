# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'API V1 Profile', type: :request do
  describe 'GET /api/v1/me' do
    let(:user) { create(:user, :active, username: 'amy') }

    it 'returns the current user with standing' do
      get '/api/v1/me', headers: auth_headers(user)

      expect(response).to have_http_status(:ok)
      expect(json).to include('id' => user.id, 'username' => 'amy', 'admin' => false)
      expect(json['standing']).to include('rank' => 1)
    end

    it 'returns the settings with defaults' do
      get '/api/v1/me', headers: auth_headers(user)

      expect(json['settings']).to eq('drzewko_mode' => false, 'bet_lock' => false)
    end

    it 'returns 401 without a token' do
      get '/api/v1/me'

      expect(response).to have_http_status(:unauthorized)
    end
  end

  describe 'GET /api/v1/me/settings/stats' do
    let(:user) { create(:user, :active) }

    it 'returns how many users have each setting enabled' do
      create(:user, :active, settings: { 'drzewko_mode' => true, 'bet_lock' => true })
      create(:user, :active, settings: { 'drzewko_mode' => true })

      get '/api/v1/me/settings/stats', headers: auth_headers(user)

      expect(response).to have_http_status(:ok)
      expect(json).to eq('drzewko_mode' => 2, 'bet_lock' => 1)
    end

    it 'returns 401 without a token' do
      get '/api/v1/me/settings/stats'

      expect(response).to have_http_status(:unauthorized)
    end
  end

  describe 'PATCH /api/v1/me/settings' do
    let(:user) { create(:user, :active) }

    it 'updates a single setting and leaves the rest at their defaults' do
      patch '/api/v1/me/settings', params: { settings: { bet_lock: true } }, headers: auth_headers(user), as: :json

      expect(response).to have_http_status(:ok)
      expect(json['settings']).to eq('drzewko_mode' => false, 'bet_lock' => true)
      expect(user.reload.bet_lock?).to be(true)
    end

    it 'returns 401 without a token' do
      patch '/api/v1/me/settings', params: { settings: { bet_lock: true } }, as: :json

      expect(response).to have_http_status(:unauthorized)
    end
  end
end
