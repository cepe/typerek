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
