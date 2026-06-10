# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'Match result notification', type: :request do
  let(:admin) { create(:user, :admin) }

  it 'enqueues NotifyMatchResultJob when a result is first entered' do
    match = create(:match, :without_results)

    expect do
      put "/api/v1/matches/#{match.id}", params: { result_a: 2, result_b: 1 }, headers: auth_headers(admin)
    end.to have_enqueued_job(NotifyMatchResultJob).with(match.id)
  end

  it 'does not enqueue when editing an already-finished match' do
    match = create(:match, result_a: 1, result_b: 0)

    expect do
      put "/api/v1/matches/#{match.id}", params: { result_a: 3, result_b: 0 }, headers: auth_headers(admin)
    end.not_to have_enqueued_job(NotifyMatchResultJob)
  end
end
