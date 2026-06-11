# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'Api::V1::Push::Broadcasts', type: :request do
  let(:admin) { create(:user, :admin) }
  let(:user) { create(:user) }

  it 'enqueues a broadcast job for an admin' do
    expect do
      post '/api/v1/push/broadcast', params: { title: 'Cześć', body: 'Test' },
                                     headers: auth_headers(admin)
    end.to have_enqueued_job(BroadcastPushJob).with(title: 'Cześć', body: 'Test')

    expect(response).to have_http_status(:accepted)
  end

  it 'forbids non-admins' do
    post '/api/v1/push/broadcast', params: { title: 'Cześć', body: 'Test' }, headers: auth_headers(user)
    expect(response).to have_http_status(:forbidden)
  end

  it 'rejects a blank title or body' do
    post '/api/v1/push/broadcast', params: { title: '', body: 'Test' }, headers: auth_headers(admin)
    expect(response).to have_http_status(:unprocessable_entity)
  end
end
