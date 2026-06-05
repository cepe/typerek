# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'API V1 Invitations', type: :request do
  let(:admin) { create(:user, :active, :admin) }
  let(:invited) { User.create(username: 'invitee', invited_by: admin) }
  let(:token) { invited.generate_token_for(:invitation) }

  describe 'GET /api/v1/invitations/:token' do
    it 'returns the username for a valid token' do
      get "/api/v1/invitations/#{token}"

      expect(response).to have_http_status(:ok)
      expect(json).to eq('username' => 'invitee')
    end

    it 'returns 404 invalid_token for a bad token' do
      get '/api/v1/invitations/garbage'

      expect(response).to have_http_status(:not_found)
      expect(json.dig('error', 'code')).to eq('invalid_token')
    end
  end

  describe 'POST /api/v1/invitations/:token/accept' do
    it 'sets the password, activates the account and returns a JWT' do
      post "/api/v1/invitations/#{token}/accept",
           params: { password: 'secret123', password_confirmation: 'secret123' }, as: :json

      expect(response).to have_http_status(:ok)
      expect(json['token']).to be_present
      expect(json['user']).to include('username' => 'invitee')
      expect(invited.reload.invitation_accepted_at).to be_present
    end

    it 'returns 422 when the passwords do not match' do
      post "/api/v1/invitations/#{token}/accept",
           params: { password: 'secret123', password_confirmation: 'nope' }, as: :json

      expect(response).to have_http_status(:unprocessable_entity)
    end

    it 'returns 404 invalid_token for a bad token' do
      post '/api/v1/invitations/garbage/accept',
           params: { password: 'secret123', password_confirmation: 'secret123' }, as: :json

      expect(response).to have_http_status(:not_found)
      expect(json.dig('error', 'code')).to eq('invalid_token')
    end

    it 'invalidates the token once accepted (setting the password rotates the salt)' do
      post "/api/v1/invitations/#{token}/accept",
           params: { password: 'secret123', password_confirmation: 'secret123' }, as: :json
      expect(response).to have_http_status(:ok)

      get "/api/v1/invitations/#{token}"

      expect(response).to have_http_status(:not_found)
      expect(json.dig('error', 'code')).to eq('invalid_token')
    end

    it 'issues a JWT that authenticates subsequent requests' do
      post "/api/v1/invitations/#{token}/accept",
           params: { password: 'secret123', password_confirmation: 'secret123' }, as: :json
      jwt = json['token']

      get '/api/v1/me', headers: { 'Authorization' => "Bearer #{jwt}" }

      expect(response).to have_http_status(:ok)
      expect(json).to include('username' => 'invitee')
    end
  end
end
