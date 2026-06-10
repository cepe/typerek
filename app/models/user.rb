# frozen_string_literal: true

class User < ApplicationRecord
  # Per-user UI preferences, stored in the `settings` jsonb column. New keys can be
  # added here without a migration; everything defaults to off.
  SETTINGS_DEFAULTS = { 'drzewko_mode' => false, 'bet_lock' => false }.freeze

  has_secure_password validations: false

  generates_token_for :invitation, expires_in: 72.hours do
    password_salt&.last(10)
  end

  has_many :answers, dependent: :destroy
  has_many :matches, through: :answers
  belongs_to :invited_by, polymorphic: true, optional: true

  scope :active, -> { where.not(invitation_accepted_at: nil) }

  validates :username, uniqueness: true, presence: true, length: { maximum: 255 }
  validates :password, confirmation: true, presence: true, length: { minimum: 6 }, on: :update

  delegate :username, to: :invited_by, prefix: true, allow_nil: true

  def points
    answers.map(&:point).sum.round(2)
  end

  def answer_by_match(match)
    answers.find_by(match: match)
  end

  def accuracy
    answers.map(&:point).count { |score| score > 0.0 }
  end

  def accept_invitation(params = {})
    update(params.merge(invitation_accepted_at: DateTime.now))
  end

  # Number of users with each setting switched on, keyed by the setting name.
  # Powers the "Włączone przez N osób" hint on the settings screen. Users who have
  # never toggled anything store no key and so are naturally counted as "off".
  def self.settings_counts
    SETTINGS_DEFAULTS.keys.index_with do |key|
      where("settings ->> ? = 'true'", key).count
    end
  end

  def settings_with_defaults
    SETTINGS_DEFAULTS.merge(settings || {})
  end

  def drzewko_mode?
    settings_with_defaults['drzewko_mode'] == true
  end

  def bet_lock?
    settings_with_defaults['bet_lock'] == true
  end
end
