# frozen_string_literal: true

module Typerek
  module Ranking
    # A single ranking row: the user along with their computed position, points
    # and number of correct bets.
    Entry = Struct.new(:user, :points, :accuracy, :position, keyword_init: true)
  end
end