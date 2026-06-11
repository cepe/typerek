# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'Api::V1::Push::Reminders', type: :request do
  let(:admin) { create(:user, :admin) }
  let(:user) { create(:user) }

  it 'enqueues the reminder job for an admin' do
    expect do
      post '/api/v1/push/reminders', headers: auth_headers(admin)
    end.to have_enqueued_job(SendMatchRemindersJob)

    expect(response).to have_http_status(:accepted)
  end

  it 'forbids non-admins' do
    post '/api/v1/push/reminders', headers: auth_headers(user)
    expect(response).to have_http_status(:forbidden)
  end
end
