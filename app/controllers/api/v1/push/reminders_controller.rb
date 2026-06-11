# frozen_string_literal: true

module Api
  module V1
    module Push
      # Admin-only: manually run the unbet-match reminder job — the very same one the
      # scheduler fires every 15 minutes. Handy for testing the reminder path without
      # waiting for the timer. It stays idempotent (match_reminders), so triggering it
      # repeatedly won't double-send.
      class RemindersController < BaseController
        def create
          authorize! :broadcast, :push

          SendMatchRemindersJob.perform_later
          head :accepted
        end
      end
    end
  end
end
