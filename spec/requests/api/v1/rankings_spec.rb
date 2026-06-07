# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'API V1 Ranking', type: :request do
  describe 'GET /api/v1/ranking' do
    it 'returns ordered entries with position, points and accuracy' do
      match = create(:match, :start_in_past, :winner_a, win_a: 5.0)
      amy = create(:user, :active, username: 'amy')
      create(:user, :active, username: 'bob')
      create(:answer, match: match, user: amy, result: :win_a)

      get '/api/v1/ranking', headers: auth_headers(amy)

      expect(response).to have_http_status(:ok)
      expect(json.first).to include('position' => 1, 'points' => 5.0, 'accuracy' => 1)
      expect(json.first['user']).to include('username' => 'amy')
    end
  end

  describe 'GET /api/v1/ranking/history' do
    it 'returns matches and aligned series arrays' do
      match1 = create(:match, :winner_a, win_a: 3.0, start: 2.days.ago)
      match2 = create(:match, :winner_a, win_a: 2.0, start: 1.day.ago)
      amy = create(:user, :active, username: 'amy')
      create(:answer, match: match1, user: amy, result: :win_a)
      create(:answer, match: match2, user: amy, result: :win_a)

      get '/api/v1/ranking/history', headers: auth_headers(amy)

      expect(response).to have_http_status(:ok)
      expect(json['matches'].length).to eq(2)
      expect(json['matches'].first).to include('team_a', 'team_b', 'result_a', 'result_b', 'start')
      expect(json['series'].length).to eq(1)
      amy_series = json['series'].first
      expect(amy_series['user']).to include('username' => 'amy')
      expect(amy_series['positions'].length).to eq(2)
      expect(amy_series['points'].length).to eq(2)
      expect(amy_series['points']).to eq([3.0, 5.0])
    end

    it 'returns empty matches and series when no matches are finished' do
      amy = create(:user, :active, username: 'amy')

      get '/api/v1/ranking/history', headers: auth_headers(amy)

      expect(response).to have_http_status(:ok)
      expect(json['matches']).to be_empty
      expect(json['series'].first['positions']).to be_empty
    end
  end
end
