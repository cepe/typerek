# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'API V1 Invitations', type: :request do
  let(:admin) { create(:user, :active, :admin) }
  let(:invited) { Typerek::CreateInvitation::Handler.new(username: 'invitee', invited_by: admin).call }
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
  end
end
