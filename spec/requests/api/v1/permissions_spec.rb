# frozen_string_literal: true

require 'rails_helper'

# Locks the security rules the original app enforced, now guaranteed by the API:
#  - authentication is required
#  - a user cannot see anyone else's bet before a match starts
#  - a user cannot place/change a bet once a match has started (or finished)
#  - admin-only actions are forbidden for regular users
RSpec.describe 'API V1 authorization & bet visibility', type: :request do
  let(:me)    { create(:user, :active, username: 'me') }
  let(:other) { create(:user, :active, username: 'other') }
  let(:admin) { create(:user, :active, :admin, username: 'admin') }

  describe 'authentication is required' do
    it 'rejects requests without a valid token' do
      [
        -> { get '/api/v1/me' },
        -> { get '/api/v1/matches' },
        -> { get '/api/v1/ranking' },
        -> { get '/api/v1/users' }
      ].each do |request|
        request.call
        expect(response).to have_http_status(:unauthorized)
      end
    end
  end

  describe 'a match that has NOT started' do
    let(:match) { create(:match, :start_in_future, :without_results) }

    before do
      create(:answer, match: match, user: me, result: :win_a)
      create(:answer, match: match, user: other, result: :win_b)
    end

    it 'never exposes other participants and shows each caller only their own bet' do
      get "/api/v1/matches/#{match.id}", headers: auth_headers(me)
      expect(response).to have_http_status(:ok)
      expect(json['started']).to be(false)
      expect(json).not_to have_key('participants')
      expect(json['my_answer']).to eq('win_a')

      get "/api/v1/matches/#{match.id}", headers: auth_headers(other)
      expect(json).not_to have_key('participants')
      expect(json['my_answer']).to eq('win_b')
    end

    it 'does not leak other bets through the match list' do
      get '/api/v1/matches', headers: auth_headers(me)
      listed = json['not_finished'].find { |m| m['id'] == match.id }
      expect(listed['my_answer']).to eq('win_a')
      expect(listed).not_to have_key('participants')
    end
  end

  describe 'a match that has started' do
    let(:match) { create(:match, :start_in_past, :without_results) }

    before do
      create(:answer, match: match, user: me, result: :win_a)
      create(:answer, match: match, user: other, result: :win_b)
    end

    it 'exposes every participant bet' do
      get "/api/v1/matches/#{match.id}", headers: auth_headers(me)

      expect(json['started']).to be(true)
      bets = json['participants'].to_h { |p| [p['user']['username'], p['result']] }
      expect(bets).to include('me' => 'win_a', 'other' => 'win_b')
    end
  end

  describe 'placing / changing a bet' do
    it 'is allowed before the match starts' do
      match = create(:match, :start_in_future, :without_results)

      put "/api/v1/matches/#{match.id}/bet", params: { result: 'tie' }, headers: auth_headers(me), as: :json

      expect(response).to have_http_status(:ok)
      expect(Answer.find_by(match: match, user: me).result).to eq('tie')
    end

    it 'is rejected once the match is in progress' do
      match = create(:match, :start_in_past, :without_results)

      put "/api/v1/matches/#{match.id}/bet", params: { result: 'tie' }, headers: auth_headers(me), as: :json

      expect(response).to have_http_status(:unprocessable_entity)
      expect(Answer.where(match: match, user: me)).to be_empty
    end

    it 'is rejected after the match has finished' do
      match = create(:match, :start_in_past, :winner_a)

      put "/api/v1/matches/#{match.id}/bet", params: { result: 'tie' }, headers: auth_headers(me), as: :json

      expect(response).to have_http_status(:unprocessable_entity)
    end

    it 'does not modify an existing bet after the match starts' do
      match = create(:match, :start_in_future, :without_results)
      create(:answer, match: match, user: me, result: :win_a)
      match.update!(start: 1.hour.ago) # kickoff

      put "/api/v1/matches/#{match.id}/bet", params: { result: 'win_b' }, headers: auth_headers(me), as: :json

      expect(response).to have_http_status(:unprocessable_entity)
      expect(Answer.find_by(match: match, user: me).result).to eq('win_a')
    end

    it 'can only bet as the caller (user_id is not client-controlled)' do
      match = create(:match, :start_in_future, :without_results)

      put "/api/v1/matches/#{match.id}/bet",
          params: { result: 'tie', user_id: other.id }, headers: auth_headers(me), as: :json

      expect(response).to have_http_status(:ok)
      expect(Answer.find_by(match: match, user: me).result).to eq('tie')
      expect(Answer.where(match: match, user: other)).to be_empty
    end
  end

  describe 'admin-only actions' do
    let(:match) { create(:match, :start_in_future, :without_results) }

    it 'are forbidden for a regular user — match edit' do
      put "/api/v1/matches/#{match.id}", params: { team_a: 'Hacked' }, headers: auth_headers(me), as: :json

      expect(response).to have_http_status(:forbidden)
      expect(match.reload.team_a).not_to eq('Hacked')
    end

    it 'are forbidden for a regular user — user management' do
      get '/api/v1/users', headers: auth_headers(me)
      expect(response).to have_http_status(:forbidden)

      post '/api/v1/users', params: { username: 'x' }, headers: auth_headers(me), as: :json
      expect(response).to have_http_status(:forbidden)

      patch "/api/v1/users/#{other.id}/fin", headers: auth_headers(me), as: :json
      expect(response).to have_http_status(:forbidden)

      post "/api/v1/users/#{other.id}/resend-invitation", headers: auth_headers(me), as: :json
      expect(response).to have_http_status(:forbidden)

      delete "/api/v1/users/#{other.id}", headers: auth_headers(me)
      expect(response).to have_http_status(:forbidden)
      expect(User.exists?(other.id)).to be(true)
    end

    it 'are allowed for an admin' do
      put "/api/v1/matches/#{match.id}", params: { team_a: 'Polska' }, headers: auth_headers(admin), as: :json
      expect(response).to have_http_status(:ok)

      get '/api/v1/users', headers: auth_headers(admin)
      expect(response).to have_http_status(:ok)

      post "/api/v1/users/#{other.id}/resend-invitation", headers: auth_headers(admin), as: :json
      expect(response).to have_http_status(:ok)
      expect(json['token']).to be_present
    end
  end

  describe 'user profile visibility' do
    it 'shows a user bets only on started matches, never on upcoming ones' do
      future  = create(:match, :start_in_future, :without_results)
      started = create(:match, :start_in_past, :without_results)
      create(:answer, match: future, user: other, result: :win_a)
      create(:answer, match: started, user: other, result: :win_b)

      get "/api/v1/users/#{other.id}", headers: auth_headers(me)

      expect(response).to have_http_status(:ok)
      ids = json['started_matches'].map { |m| m['id'] }
      expect(ids).to include(started.id)
      expect(ids).not_to include(future.id)
      expect(json['started_matches'].map { |m| m['answer'] }).to eq(['win_b'])
    end
  end
end
