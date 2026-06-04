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

    it 'returns 401 without a token' do
      get '/api/v1/me'

      expect(response).to have_http_status(:unauthorized)
    end
  end
end
