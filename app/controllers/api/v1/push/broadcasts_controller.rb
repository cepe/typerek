# frozen_string_literal: true

module Api
  module V1
    module Push
      # Admin-only: send an arbitrary push notification to every opted-in user. Used
      # for announcements and for testing the whole delivery path end to end.
      class BroadcastsController < BaseController
        def create
          authorize! :broadcast, :push

          title = params[:title].to_s.strip
          body = params[:body].to_s.strip
          return unprocessable!('Tytuł i treść są wymagane.') if title.blank? || body.blank?

          BroadcastPushJob.perform_later(title: title, body: body, url: params[:url].presence || '/')
          head :accepted
        end
      end
    end
  end
end
