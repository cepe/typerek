# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'SPA + API routing', type: :routing do
  it 'routes the root and client-side paths to the SPA shell' do
    expect(get: '/').to route_to('spa#index')
    expect(get: '/matches').to route_to('spa#index', path: 'matches')
    expect(get: '/users/5').to route_to('spa#index', path: 'users/5')
  end

  it 'still routes the JSON API' do
    expect(get: '/api/v1/ranking').to route_to('api/v1/rankings#show')
    expect(post: '/api/v1/auth/login').to route_to('api/v1/auth#login')
    expect(put: '/api/v1/matches/7/bet').to route_to('api/v1/matches#bet', id: '7')
  end

  it 'does not hijack the health check' do
    expect(get: '/up').to route_to('rails/health#show')
  end
end
