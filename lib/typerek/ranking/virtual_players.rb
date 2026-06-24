# frozen_string_literal: true

module Typerek
  module Ranking
    # Three synthetic benchmark "players" scored over the finished matches with the
    # same rule as a real bet (Answer#point): a pick scores the match's odds for it
    # when that outcome won, otherwise 0. They are an opt-in overlay on the ranking
    # (the virtual_players setting) that lets a real player see how their tipping
    # stacks up against three naive strategies:
    #
    #   Faworyt  — always backs the more likely side (the lower of win_a / win_b)
    #   Underdog — always backs the less likely side (the higher of win_a / win_b)
    #   Remis    — always bets a tie
    #
    # Returns plain data ([{ key:, username:, points:, accuracy: }], best first).
    # Depends only on finished matches' odds and results, so it shares the ranking's
    # cache fingerprint (see Query.cache_version) and self-invalidates with it.
    class VirtualPlayers
      Player = Struct.new(:key, :username, :strategy, keyword_init: true)

      PLAYERS = [
        Player.new(key: 'favourite', username: 'Faworyt',  strategy: :favourite),
        Player.new(key: 'underdog',  username: 'Underdog', strategy: :underdog),
        Player.new(key: 'draw',      username: 'Remis',    strategy: :draw)
      ].freeze

      def self.call
        new.call
      end

      def call
        matches = Match.finished.to_a
        PLAYERS.map { |player| score(player, matches) }
               .sort_by { |row| [-row[:points], row[:username]] }
      end

      private

      def score(player, matches)
        points = 0.0
        accuracy = 0
        matches.each do |match|
          result = pick_for(player, match)
          next if result.nil? || !match.winning_list.include?(result.to_s)

          odds = match.public_send(result)
          next if odds.nil?

          points += odds.round(2)
          accuracy += 1
        end
        { key: player.key, username: player.username, points: points.round(2), accuracy: accuracy }
      end

      # The bet this player would place on the match, or nil when it can't be
      # determined (favourite/underdog need both head-to-head odds to compare).
      def pick_for(player, match)
        case player.strategy
        when :draw then :tie
        when :favourite then head_to_head(match)&.first
        when :underdog then head_to_head(match)&.last
        end
      end

      # [more_likely, less_likely] outcomes by odds (lower odds = more likely), or
      # nil when either side's odds are missing. A tie in odds resolves to win_a.
      def head_to_head(match)
        return nil if match.win_a.nil? || match.win_b.nil?

        match.win_a <= match.win_b ? %i[win_a win_b] : %i[win_b win_a]
      end
    end
  end
end
