# frozen_string_literal: true

module Typerek
  # Namespace for the participant ranking. Also holds the per-season "prize zone"
  # size, which is otherwise pure configuration with no natural home.
  module Ranking
    # How many of the top positions are "in the money" this season — the prize
    # zone the ranking UI highlights. It is decided once at the start of the
    # season (this year 5, last year 4) and pinned via the REWARDED_POSITIONS env
    # var at deploy time; defaults to 5. The client reads it through
    # CurrentUser#rewarded_positions.
    REWARDED_POSITIONS = Integer(ENV.fetch('REWARDED_POSITIONS', 5))
  end
end