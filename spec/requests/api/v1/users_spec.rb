# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'API V1 Users', type: :request do
  let(:admin) { create(:user, :active, :admin) }
  let(:member) { create(:user, :active) }

  describe 'GET /api/v1/users' do
    it 'lists users for an admin' do
      get '/api/v1/users', headers: auth_headers(admin)

      expect(response).to have_http_status(:ok)
      expect(json).to be_an(Array)
    end

    it 'is forbidden for a non-admin' do
      get '/api/v1/users', headers: auth_headers(member)

      expect(response).to have_http_status(:forbidden)
    end
  end

  describe 'POST /api/v1/users' do
    it 'creates an invitation and returns an activation link' do
      post '/api/v1/users', params: { username: 'newbie' }, headers: auth_headers(admin), as: :json

      expect(response).to have_http_status(:created)
      expect(json['user']).to include('username' => 'newbie', 'active' => false)
      expect(json['token']).to be_present
      expect(json['url']).to include(json['token'])
    end

    it 'returns 422 with field errors for a blank username' do
      post '/api/v1/users', params: { username: '' }, headers: auth_headers(admin), as: :json

      expect(response).to have_http_status(:unprocessable_entity)
      expect(json.dig('error', 'fields')).to have_key('username')
    end
  end

  describe 'PATCH /api/v1/users/:id/fin' do
    it 'toggles the confirmation flag' do
      target = create(:user, :active, fin: false)

      patch "/api/v1/users/#{target.id}/fin", headers: auth_headers(admin), as: :json

      expect(response).to have_http_status(:ok)
      expect(json['fin']).to be(true)
    end
  end

  describe 'DELETE /api/v1/users/:id' do
    it 'removes the user' do
      target = create(:user, :active)

      delete "/api/v1/users/#{target.id}", headers: auth_headers(admin)

      expect(response).to have_http_status(:no_content)
      expect(User.exists?(target.id)).to be(false)
    end
  end

  describe 'GET /api/v1/users/:id' do
    it 'returns the profile for any signed-in user' do
      target = create(:user, :active, username: 'target')

      get "/api/v1/users/#{target.id}", headers: auth_headers(member)

      expect(response).to have_http_status(:ok)
      expect(json['user']).to include('username' => 'target')
      expect(json['started_matches']).to be_an(Array)
    end
  end
end
