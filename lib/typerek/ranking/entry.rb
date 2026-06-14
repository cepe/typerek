# frozen_string_literal: true

module Typerek
  module Ranking
    # A single ranking row: the user along with their computed position, points
    # and number of correct bets. `previous_position` is where they stood before
    # the most recent finished match (for the movement arrow), or nil when there
    # is no prior ranking to compare against yet.
    Entry = Struct.new(:user, :points, :accuracy, :position, :previous_position, keyword_init: true)
  end
end