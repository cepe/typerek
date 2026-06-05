# frozen_string_literal: true

Rails.application.routes.draw do
  get 'up' => 'rails/health#show', as: :rails_health_check

  # Decoupled JSON API. The React SPA talks to the backend only through this.
  namespace :api do
    namespace :v1 do
      post 'auth/login', to: 'auth#login'
      post 'auth/logout', to: 'auth#logout'
      get 'me', to: 'profile#show'

      resources :matches, only: %i[index show update] do
        member { put :bet }
      end

      get 'ranking', to: 'rankings#show'

      resources :users, only: %i[index create show destroy] do
        member do
          post :resend_invitation, path: 'resend-invitation'
          patch :fin
        end
      end

      get 'invitations/:token', to: 'invitations#show', constraints: { token: %r{[^/]+} }
      post 'invitations/:token/accept', to: 'invitations#accept', constraints: { token: %r{[^/]+} }
    end
  end

  # Single-page app: the built index.html is served for the root and every
  # client-side route. Real files in public/ (hashed JS/CSS) are served by
  # the static middleware before reaching the router; anything else (no dot in the
  # path, not the API/health/internal routes) falls back to the SPA shell.
  root to: 'spa#index'
  get '*path', to: 'spa#index', format: false,
                constraints: ->(req) { !req.path.start_with?('/api', '/up', '/rails') && req.path.exclude?('.') }
end
