# frozen_string_literal: true

module Api
  module V1
    # The `RankingEntry` schema — a single ranking row.
    class RankingEntrySerializer
      def self.many(entries)
        entries.map { |entry| call(entry) }
      end

      def self.call(entry)
        {
          position: entry.position,
          user: { id: entry.user.id, username: entry.user.username },
          points: entry.points,
          accuracy: entry.accuracy
        }
      end
    end
  end
end