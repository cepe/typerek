# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'API V1 Ranking', type: :request do
  describe 'GET /api/v1/ranking' do
    it 'returns ordered entries with position, points and accuracy' do
      match = create(:match, :start_in_past, :winner_a, win_a: 5.0, win_tie_a: 1.5, not_tie: 1.2)
      amy = create(:user, :active, username: 'amy')
      create(:user, :active, username: 'bob')
      create(:answer, match: match, user: amy, result: :win_a)

      get '/api/v1/ranking', headers: auth_headers(amy)

      expect(response).to have_http_status(:ok)
      expect(json['entries'].first).to include('position' => 1, 'points' => 5.0, 'accuracy' => 1)
      expect(json['entries'].first['user']).to include('username' => 'amy')
    end

    it 'reports the perfect score: the best obtainable points across finished matches' do
      # win_a is the best-paying correct outcome (5.0); the other winning outcomes
      # (win_tie_a, not_tie) pay less, so the ceiling for this match is 5.0.
      create(:match, :start_in_past, :winner_a, win_a: 5.0, win_tie_a: 1.5, not_tie: 1.2)
      amy = create(:user, :active, username: 'amy')

      get '/api/v1/ranking', headers: auth_headers(amy)

      expect(response).to have_http_status(:ok)
      expect(json['perfect_score']).to eq(5.0)
    end

    it 'reports a zero perfect score when nothing has finished yet' do
      create(:match, :start_in_future, :without_results)
      amy = create(:user, :active, username: 'amy')

      get '/api/v1/ranking', headers: auth_headers(amy)

      expect(json['perfect_score']).to eq(0.0)
    end

    it 'includes the three virtual benchmark players' do
      create(:match, :start_in_past, :winner_a, win_a: 1.5, win_b: 4.0)
      amy = create(:user, :active, username: 'amy')

      get '/api/v1/ranking', headers: auth_headers(amy)

      expect(json['virtual_players'].map { |p| p['key'] })
        .to contain_exactly('favourite', 'underdog', 'draw')
      favourite = json['virtual_players'].find { |p| p['key'] == 'favourite' }
      # win_a (1.5) is the favourite and team A won, so the favourite scores its odds.
      expect(favourite).to include('username' => 'Faworyt', 'points' => 1.5, 'accuracy' => 1)
    end
  end

  describe 'GET /api/v1/ranking/virtual_players/:key' do
    it 'returns the strategy totals and its pick on each started match' do
      create(:match, :start_in_past, :winner_a, win_a: 1.5, win_b: 4.0)
      amy = create(:user, :active, username: 'amy')

      get '/api/v1/ranking/virtual_players/favourite', headers: auth_headers(amy)

      expect(response).to have_http_status(:ok)
      expect(json['player']).to include('key' => 'favourite', 'username' => 'Faworyt', 'accuracy' => 1)
      expect(json['started_matches'].length).to eq(1)
      expect(json['started_matches'].first['answer']).to eq('win_a')
    end

    it 'returns 404 for an unknown strategy key' do
      amy = create(:user, :active, username: 'amy')

      get '/api/v1/ranking/virtual_players/nope', headers: auth_headers(amy)

      expect(response).to have_http_status(:not_found)
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
