# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Typerek::CreateInvitation::Handler do
  describe '#call' do
    let(:admin) { create(:user, :admin) }

    context 'with a valid username' do
      it 'creates an invited, not-yet-active user' do
        user = described_class.new(username: 'newbie', invited_by: admin).call

        expect(user).to be_persisted
        expect(user.username).to eq('newbie')
        expect(user.invited_by).to eq(admin)
        expect(user.invitation_accepted_at).to be_nil
      end
    end

    context 'with a blank username' do
      it 'returns an unsaved user carrying validation errors' do
        user = described_class.new(username: '', invited_by: admin).call

        expect(user).not_to be_persisted
        expect(user.errors[:username]).to be_present
      end
    end
  end
end