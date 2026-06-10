# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'API V1 Bets', type: :request do
  let(:user) { create(:user, :active) }

  describe 'GET /api/v1/bets' do
    it 'requires authentication' do
      get '/api/v1/bets'

      expect(response).to have_http_status(:unauthorized)
    end

    it 'returns only started matches, oldest first, with all bets and my_answer' do
      older = create(:match, :winner_a, start: 2.days.ago)
      newer = create(:match, :without_results, start: 1.hour.ago)
      create(:match, :start_in_future)
      other = create(:user, :active, username: 'zzz')
      create(:answer, match: newer, user: other, result: :tie)
      create(:answer, match: newer, user: user, result: :win_a)

      get '/api/v1/bets', headers: auth_headers(user)

      expect(response).to have_http_status(:ok)
      expect(json.map { |m| m['id'] }).to eq([older.id, newer.id])

      entry = json.find { |m| m['id'] == newer.id }
      expect(entry['my_answer']).to eq('win_a')
      bet = entry['participants'].find { |p| p['user']['id'] == other.id }
      expect(bet['result']).to eq('tie')
    end
  end
end
