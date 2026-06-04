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
end
