# frozen_string_literal: true

# Helpers for API request specs: build a Bearer header for a user and read the
# parsed JSON response body.
module AuthHelpers
  def auth_headers(user)
    { 'Authorization' => "Bearer #{Typerek::AccessToken.encode(user)}" }
  end

  def json
    response.parsed_body
  end
end

RSpec.configure do |config|
  config.include AuthHelpers, type: :request
end
