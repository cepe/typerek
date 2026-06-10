# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Typerek::SetLock::Handler do
  describe '#call' do
    let(:match) { create(:match, start: 2.days.from_now) }
    let(:user) { create(:user) }

    context 'when the user has an answer on a not-started match' do
      it 'locks the answer' do
        answer = create(:answer, match: match, user: user, result: :win_a)
        described_class.new(match_id: match.id, user_id: user.id, locked: true).call

        expect(answer.reload.locked).to be(true)
      end

      it 'unlocks the answer' do
        answer = create(:answer, :locked, match: match, user: user, result: :win_a)
        described_class.new(match_id: match.id, user_id: user.id, locked: false).call

        expect(answer.reload.locked).to be(false)
      end
    end

    context 'when the user has no answer yet' do
      it 'raises error' do
        expect do
          described_class.new(match_id: match.id, user_id: user.id, locked: true).call
        end.to raise_error(Typerek::Error)
      end
    end

    context 'when match is started' do
      it 'raises error' do
        create(:answer, match: match, user: user, result: :win_a)
        match.update(start: Time.current)

        expect do
          described_class.new(match_id: match.id, user_id: user.id, locked: true).call
        end.to raise_error(Typerek::MatchAlreadyStartedError)
      end
    end

    context 'when match is not found' do
      it 'raises error' do
        expect do
          described_class.new(match_id: match.id + 1, user_id: user.id, locked: true).call
        end.to raise_error(Typerek::MatchNotFoundError)
      end
    end

    context 'when user is not found' do
      it 'raises error' do
        expect do
          described_class.new(match_id: match.id, user_id: user.id + 1, locked: true).call
        end.to raise_error(Typerek::UserNotFoundError)
      end
    end
  end
end
