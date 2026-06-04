# frozen_string_literal: true

Rails.application.routes.draw do
  get 'up' => 'rails/health#show', as: :rails_health_check

  get 'sign_in', to: 'sessions#new'
  post 'sign_in', to: 'sessions#create'
  delete 'sign_out', to: 'sessions#destroy'

  resources :users, only: %i[index create destroy show] do
    member do
      get :resend_invitation
      post :fin
    end
  end
  resource :invitation, only: %i[show update]
  resource :home, only: :show
  resource :ranking, only: :show
  resources :matches, except: %i[create destroy new] do
    member do
      post :set_type
    end
  end

  # Decoupled JSON API (see openapi.yaml). Runs in parallel with the HTML views
  # during the frontend split; a future Spring Boot backend implements the same
  # contract so the React frontend stays unchanged.
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
          post :resend_invitation
          patch :fin
        end
      end

      get 'invitations/:token', to: 'invitations#show', constraints: { token: %r{[^/]+} }
      post 'invitations/:token/accept', to: 'invitations#accept', constraints: { token: %r{[^/]+} }
    end
  end

  root to: 'homes#show'
end
