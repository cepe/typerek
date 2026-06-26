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

    it 'returns the settings with defaults' do
      get '/api/v1/me', headers: auth_headers(user)

      expect(json['settings']).to eq(
        'drzewko_mode' => false, 'bet_lock' => false, 'push_enabled' => false,
        'push_results' => true, 'push_reminders' => true, 'theme' => 'light',
        'favorite_user_ids' => [], 'match_order_by_ranking' => false,
        'virtual_players' => false, 'seed_strategy' => false
      )
    end

    it 'returns 401 without a token' do
      get '/api/v1/me'

      expect(response).to have_http_status(:unauthorized)
    end
  end

  describe 'GET /api/v1/me/settings/stats' do
    let(:user) { create(:user, :active) }

    it 'returns how many users have each setting enabled' do
      create(:user, :active, settings: { 'drzewko_mode' => true, 'bet_lock' => true })
      create(:user, :active, settings: { 'drzewko_mode' => true, 'theme' => 'dark' })
      create(:user, :active, settings: { 'theme' => 'auto' })
      create(:user, :active, settings: { 'theme' => 'light' })
      create(:user, :active, settings: { 'match_order_by_ranking' => true })
      create(:user, :active, settings: { 'virtual_players' => true })

      get '/api/v1/me/settings/stats', headers: auth_headers(user)

      expect(response).to have_http_status(:ok)
      expect(json).to eq(
        'drzewko_mode' => 2, 'bet_lock' => 1, 'push_enabled' => 0,
        'match_order_by_ranking' => 1, 'virtual_players' => 1, 'seed_strategy' => 0, 'theme' => 2
      )
    end

    it 'returns 401 without a token' do
      get '/api/v1/me/settings/stats'

      expect(response).to have_http_status(:unauthorized)
    end
  end

  describe 'PATCH /api/v1/me/settings' do
    let(:user) { create(:user, :active) }

    it 'updates a single setting and leaves the rest at their defaults' do
      patch '/api/v1/me/settings', params: { settings: { bet_lock: true } }, headers: auth_headers(user), as: :json

      expect(response).to have_http_status(:ok)
      expect(json['settings']).to eq(
        'drzewko_mode' => false, 'bet_lock' => true, 'push_enabled' => false,
        'push_results' => true, 'push_reminders' => true, 'theme' => 'light',
        'favorite_user_ids' => [], 'match_order_by_ranking' => false,
        'virtual_players' => false, 'seed_strategy' => false
      )
      expect(user.reload.bet_lock?).to be(true)
    end

    it 'updates the match-order-by-ranking preference' do
      patch '/api/v1/me/settings', params: { settings: { match_order_by_ranking: true } },
            headers: auth_headers(user), as: :json

      expect(response).to have_http_status(:ok)
      expect(json['settings']).to include('match_order_by_ranking' => true)
      expect(user.reload.match_order_by_ranking?).to be(true)
    end

    it 'updates the virtual-players preference' do
      patch '/api/v1/me/settings', params: { settings: { virtual_players: true } },
            headers: auth_headers(user), as: :json

      expect(response).to have_http_status(:ok)
      expect(json['settings']).to include('virtual_players' => true)
      expect(user.reload.virtual_players?).to be(true)
    end

    it 'updates the seed-strategy preference' do
      patch '/api/v1/me/settings', params: { settings: { seed_strategy: true } },
            headers: auth_headers(user), as: :json

      expect(response).to have_http_status(:ok)
      expect(json['settings']).to include('seed_strategy' => true)
      expect(user.reload.seed_strategy?).to be(true)
    end

    it 'accepts a valid theme preference' do
      patch '/api/v1/me/settings', params: { settings: { theme: 'auto' } }, headers: auth_headers(user), as: :json

      expect(response).to have_http_status(:ok)
      expect(json['settings']).to include('theme' => 'auto')
      expect(user.reload.theme).to eq('auto')
    end

    it 'ignores an invalid theme and keeps the current one' do
      user.update_column(:settings, { 'theme' => 'dark' })

      patch '/api/v1/me/settings', params: { settings: { theme: 'neon' } }, headers: auth_headers(user), as: :json

      expect(response).to have_http_status(:ok)
      expect(json['settings']).to include('theme' => 'dark')
      expect(user.reload.theme).to eq('dark')
    end

    it 'stores favourite user ids, deduped and without the user itself' do
      a = create(:user, :active)
      b = create(:user, :active)

      patch '/api/v1/me/settings',
            params: { settings: { favorite_user_ids: [a.id, b.id, a.id, user.id] } },
            headers: auth_headers(user), as: :json

      expect(response).to have_http_status(:ok)
      expect(json['settings']['favorite_user_ids']).to contain_exactly(a.id, b.id)
      expect(user.reload.favorite_user_ids).to contain_exactly(a.id, b.id)
    end

    it 'clears favourites when given an empty list' do
      other = create(:user, :active)
      user.update_column(:settings, { 'favorite_user_ids' => [other.id] })

      patch '/api/v1/me/settings', params: { settings: { favorite_user_ids: [] } },
            headers: auth_headers(user), as: :json

      expect(response).to have_http_status(:ok)
      expect(json['settings']['favorite_user_ids']).to eq([])
      expect(user.reload.favorite_user_ids).to eq([])
    end

    it 'returns 401 without a token' do
      patch '/api/v1/me/settings', params: { settings: { bet_lock: true } }, as: :json

      expect(response).to have_http_status(:unauthorized)
    end
  end
end
