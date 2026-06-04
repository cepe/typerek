# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Typerek::AccessToken do
  let(:user) { create(:user, :admin) }

  describe '.encode / .decode' do
    it 'round-trips the user id and role' do
      payload = described_class.decode(described_class.encode(user))

      expect(payload['sub']).to eq(user.id)
      expect(payload['admin']).to be(true)
    end

    it 'sets an expiry claim' do
      payload = described_class.decode(described_class.encode(user))

      expect(payload['exp']).to be > Time.current.to_i
    end
  end

  describe '.decode' do
    it 'returns nil for a blank token' do
      expect(described_class.decode(nil)).to be_nil
      expect(described_class.decode('')).to be_nil
    end

    it 'returns nil for a tampered/invalid token' do
      expect(described_class.decode('not-a-jwt')).to be_nil
    end

    it 'returns nil for an expired token' do
      token = described_class.encode(user, now: 2.days.ago)

      expect(described_class.decode(token)).to be_nil
    end
  end
end