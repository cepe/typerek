# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'API V1 Auth', type: :request do
  describe 'POST /api/v1/auth/login' do
    let!(:user) { create(:user, :active, username: 'alice', password: 'secret123') }

    it 'returns a token and the current user for valid credentials' do
      post '/api/v1/auth/login', params: { username: 'alice', password: 'secret123' }, as: :json

      expect(response).to have_http_status(:ok)
      expect(json['token']).to be_present
      expect(json['user']).to include('id' => user.id, 'username' => 'alice', 'admin' => false)
      expect(json['user']).to have_key('standing')
    end

    it 'returns 401 with an error code for invalid credentials' do
      post '/api/v1/auth/login', params: { username: 'alice', password: 'wrong' }, as: :json

      expect(response).to have_http_status(:unauthorized)
      expect(json.dig('error', 'code')).to eq('invalid_credentials')
    end

    it 'returns 401 invalid_credentials for an unknown username' do
      post '/api/v1/auth/login', params: { username: 'ghost', password: 'secret123' }, as: :json

      expect(response).to have_http_status(:unauthorized)
      expect(json.dig('error', 'code')).to eq('invalid_credentials')
    end

    it 'issues a token that authenticates subsequent requests' do
      post '/api/v1/auth/login', params: { username: 'alice', password: 'secret123' }, as: :json
      jwt = json['token']

      get '/api/v1/me', headers: { 'Authorization' => "Bearer #{jwt}" }

      expect(response).to have_http_status(:ok)
      expect(json).to include('username' => 'alice')
    end
  end

  # Locks the bearer-token checks in Api::V1::BaseController#authenticate!.
  describe 'bearer token verification' do
    let(:user) { create(:user, :active) }

    it 'rejects a malformed token' do
      get '/api/v1/me', headers: { 'Authorization' => 'Bearer not-a-jwt' }

      expect(response).to have_http_status(:unauthorized)
    end

    it 'rejects an expired token' do
      expired = Typerek::AccessToken.encode(user, now: 25.hours.ago)

      get '/api/v1/me', headers: { 'Authorization' => "Bearer #{expired}" }

      expect(response).to have_http_status(:unauthorized)
    end

    it 'rejects a valid token once its user has been removed' do
      headers = auth_headers(user)
      user.destroy

      get '/api/v1/me', headers: headers

      expect(response).to have_http_status(:unauthorized)
    end
  end

  describe 'POST /api/v1/auth/logout' do
    let(:user) { create(:user, :active) }

    it 'requires authentication' do
      post '/api/v1/auth/logout', as: :json

      expect(response).to have_http_status(:unauthorized)
    end

    it 'returns 204 when authenticated' do
      post '/api/v1/auth/logout', headers: auth_headers(user), as: :json

      expect(response).to have_http_status(:no_content)
    end
  end
end
