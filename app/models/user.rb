# frozen_string_literal: true

class User < ApplicationRecord
  # Per-user UI preferences, stored in the `settings` jsonb column. New keys can be
  # added here without a migration. `push_enabled` is the opt-in master switch for Web
  # Push: when off, no notification of any kind is sent (see Typerek::Push and the
  # notification jobs). `push_results`/`push_reminders` fine-tune *which* kinds are
  # sent and default ON — they only matter once push is enabled.
  SETTINGS_DEFAULTS = {
    'drzewko_mode' => false,
    'bet_lock' => false,
    'hide_odds' => false,
    'hide_double_chance' => false,
    'push_enabled' => false,
    'push_results' => true,
    'push_reminders' => true
  }.freeze

  # Settings we surface a "Włączone przez N osób" count for on the settings screen.
  # The push sub-toggles are excluded: they default on, so a raw `= 'true'` count
  # would be meaningless for them.
  COUNTED_SETTINGS = %w[drzewko_mode bet_lock hide_odds hide_double_chance push_enabled].freeze

  has_secure_password validations: false

  generates_token_for :invitation, expires_in: 72.hours do
    password_salt&.last(10)
  end

  has_many :answers, dependent: :destroy
  has_many :matches, through: :answers
  has_many :push_subscriptions, dependent: :destroy
  has_many :match_reminders, dependent: :destroy
  belongs_to :invited_by, polymorphic: true, optional: true

  scope :active, -> { where.not(invitation_accepted_at: nil) }
  # Users who opted in to push notifications. The broadcast job fans out over this.
  scope :push_enabled, -> { where("settings ->> 'push_enabled' = 'true'") }
  # Opted-in users who also want each specific kind. The sub-toggles default ON, so
  # "anything but an explicit false" counts as wanted (IS DISTINCT FROM 'false').
  scope :push_results_enabled, -> { push_enabled.where("settings ->> 'push_results' IS DISTINCT FROM 'false'") }
  scope :push_reminders_enabled, -> { push_enabled.where("settings ->> 'push_reminders' IS DISTINCT FROM 'false'") }

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
    COUNTED_SETTINGS.index_with do |key|
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

  # Hide the kursy (odds) printed under each 1 / X / 2 pill, so they don't
  # influence the pick. Purely cosmetic; the odds still drive scoring.
  def hide_odds?
    settings_with_defaults['hide_odds'] == true
  end

  # Hide the double-chance options (1X, X2, 12) in the betting grid, leaving only
  # 1 / X / 2. Purely a display preference; the options remain valid bets.
  def hide_double_chance?
    settings_with_defaults['hide_double_chance'] == true
  end

  def push_enabled?
    settings_with_defaults['push_enabled'] == true
  end

  # Sub-toggles default on: anything but an explicit false means "wanted".
  def push_results?
    settings_with_defaults['push_results'] != false
  end

  def push_reminders?
    settings_with_defaults['push_reminders'] != false
  end
end
