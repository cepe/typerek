# frozen_string_literal: true

class Match < ApplicationRecord
  has_many :answers, dependent: :destroy
  has_many :users, through: :answers

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
end
