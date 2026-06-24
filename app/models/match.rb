# frozen_string_literal: true

class Match < ApplicationRecord
  has_many :answers, dependent: :destroy
  has_many :users, through: :answers
  has_many :match_reminders, dependent: :destroy

  validates :team_a, :team_b, presence: true, length: { maximum: 255 }
  validates :win_a, :tie, :win_b, :win_tie_a, :win_tie_b, :not_tie,
            numericality: { greater_than_or_equal_to: 0 }, allow_blank: true
  validates :result_a, :result_b,
            numericality: { greater_than_or_equal_to: 0, only_integer: true },
            allow_blank: true

  scope :started, lambda {
    where(arel_table[:start].lt(DateTime.now))
      .order(start: :desc)
  }

  scope :future, lambda {
    where(arel_table[:start].gt(DateTime.now))
      .order(:start)
  }

  scope :not_finished, lambda {
    where(result_a: nil).or(where(result_b: nil)).order(start: :asc)
  }

  scope :finished, lambda {
    where.not(result_a: nil, result_b: nil).order(start: :desc)
  }

  def start_date
    start.to_date
  end

  def started?
    start.present? && start < DateTime.now
  end

  def finished?
    result_a.present? && result_b.present?
  end

  def winning_list
    return [] if result_a.blank? || result_b.blank?

    if result_a > result_b
      %w[win_a win_tie_a not_tie]
    elsif result_a < result_b
      %w[win_b win_tie_b not_tie]
    else
      %w[tie win_tie_a win_tie_b]
    end
  end

  # The most points a single perfect bet on this match could have scored: the best
  # odds among the outcomes that actually won (see #winning_list). 0.0 while the
  # match is unfinished or when none of the winning outcomes has odds set.
  def max_point
    return 0.0 unless finished?

    winning_list.filter_map { |result| send(result) }.max&.round(2) || 0.0
  end

  # The theoretical ceiling for the whole season: what a flawless tipster who hit
  # the best-paying correct outcome on every finished match would have scored.
  def self.perfect_score
    finished.sum(&:max_point).round(2)
  end
end
