# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Typerek::Authenticate::Handler do
  describe '#call' do
    let!(:user) { create(:user, username: 'alice', password: 'secret123') }

    context 'with valid credentials' do
      it 'returns the user' do
        result = described_class.new(username: 'alice', password: 'secret123').call

        expect(result).to eq(user)
      end
    end

    context 'with an invalid password' do
      it 'returns nil' do
        result = described_class.new(username: 'alice', password: 'wrong').call

        expect(result).to be_nil
      end
    end

    context 'with an unknown username' do
      it 'returns nil' do
        result = described_class.new(username: 'nobody', password: 'secret123').call

        expect(result).to be_nil
      end
    end
  end
end