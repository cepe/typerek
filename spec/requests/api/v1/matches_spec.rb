# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'API V1 Matches', type: :request do
  let(:user) { create(:user, :active) }

  describe 'GET /api/v1/matches' do
    let!(:future) { create(:match, :start_in_future, :without_results) }
    let!(:finished) { create(:match, :start_in_past, :winner_a) }

    it 'splits matches and embeds my_answer + odds' do
      create(:answer, match: future, user: user, result: :win_a)

      get '/api/v1/matches', headers: auth_headers(user)

      expect(response).to have_http_status(:ok)
      expect(json['not_finished'].map { |m| m['id'] }).to include(future.id)
      expect(json['finished'].map { |m| m['id'] }).to include(finished.id)

      mine = json['not_finished'].find { |m| m['id'] == future.id }
      expect(mine['my_answer']).to eq('win_a')
      expect(mine['odds']).to have_key('win_a')
    end
  end

  describe 'GET /api/v1/matches/:id' do
    context 'when the match has started' do
      let(:match) { create(:match, :start_in_past, :without_results) }

      it 'includes participants with their bets' do
        other = create(:user, :active, username: 'zzz')
        create(:answer, match: match, user: other, result: :tie)

        get "/api/v1/matches/#{match.id}", headers: auth_headers(user)

        expect(response).to have_http_status(:ok)
        expect(json['started']).to be(true)
        entry = json['participants'].find { |p| p['user']['id'] == other.id }
        expect(entry['result']).to eq('tie')
      end
    end

    context 'when the match is in the future' do
      let(:match) { create(:match, :start_in_future) }

      it 'omits participants' do
        get "/api/v1/matches/#{match.id}", headers: auth_headers(user)

        expect(json['started']).to be(false)
        expect(json).not_to have_key('participants')
      end
    end
  end

  describe 'PUT /api/v1/matches/:id/bet' do
    context 'on a future match' do
      let(:match) { create(:match, :start_in_future) }

      it 'records the bet' do
        put "/api/v1/matches/#{match.id}/bet", params: { result: 'win_tie_a' }, headers: auth_headers(user), as: :json

        expect(response).to have_http_status(:ok)
        expect(json).to eq('match_id' => match.id, 'result' => 'win_tie_a', 'locked' => false)
      end
    end

    context 'on a started match' do
      let(:match) { create(:match, :start_in_past, :without_results) }

      it 'is rejected with 422' do
        put "/api/v1/matches/#{match.id}/bet", params: { result: 'win_a' }, headers: auth_headers(user), as: :json

        expect(response).to have_http_status(:unprocessable_entity)
      end
    end

    context 'on a locked answer when the user enabled the bet lock' do
      let(:user) { create(:user, :active, :bet_lock) }
      let(:match) { create(:match, :start_in_future) }

      it 'is rejected with 422' do
        create(:answer, :locked, match: match, user: user, result: 'win_a')

        put "/api/v1/matches/#{match.id}/bet", params: { result: 'win_b' }, headers: auth_headers(user), as: :json

        expect(response).to have_http_status(:unprocessable_entity)
      end
    end
  end

  describe 'PUT /api/v1/matches/:id/lock' do
    let(:match) { create(:match, :start_in_future) }

    it 'locks the existing bet' do
      create(:answer, match: match, user: user, result: 'win_a')

      put "/api/v1/matches/#{match.id}/lock", params: { locked: true }, headers: auth_headers(user), as: :json

      expect(response).to have_http_status(:ok)
      expect(json).to eq('match_id' => match.id, 'result' => 'win_a', 'locked' => true)
    end

    it 'is rejected with 422 when there is no bet yet' do
      put "/api/v1/matches/#{match.id}/lock", params: { locked: true }, headers: auth_headers(user), as: :json

      expect(response).to have_http_status(:unprocessable_entity)
    end
  end

  describe 'PUT /api/v1/matches/:id (admin only)' do
    let(:match) { create(:match, :start_in_future) }

    it 'updates the match for an admin' do
      admin = create(:user, :active, :admin)

      put "/api/v1/matches/#{match.id}", params: { team_a: 'Polska', win_a: 1.5 }, headers: auth_headers(admin), as: :json

      expect(response).to have_http_status(:ok)
      expect(json['team_a']).to eq('Polska')
      expect(json['odds']['win_a']).to eq(1.5)
    end

    it 'returns 422 with field errors for invalid attributes' do
      admin = create(:user, :active, :admin)

      put "/api/v1/matches/#{match.id}", params: { team_a: '' }, headers: auth_headers(admin), as: :json

      expect(response).to have_http_status(:unprocessable_entity)
      expect(json.dig('error', 'fields')).to have_key('team_a')
    end

    it 'is forbidden for a non-admin' do
      put "/api/v1/matches/#{match.id}", params: { team_a: 'Polska' }, headers: auth_headers(user), as: :json

      expect(response).to have_http_status(:forbidden)
    end
  end
end
