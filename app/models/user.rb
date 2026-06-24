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
    'push_enabled' => false,
    'push_results' => true,
    'push_reminders' => true,
    # UI colour theme. 'light' is the default (dark mode off); 'dark' forces dark
    # mode on; 'auto' lets the SPA switch by the clock (dark at night). Unlike the
    # other settings this is a string, not a boolean — see THEMES and #theme.
    'theme' => 'light',
    # IDs of users this user starred as favourites in the ranking. Highlighted in
    # the ranking and in a match's participant ("typy") list. Unlike the others
    # this is an array, not a scalar — see #favorite_user_ids.
    'favorite_user_ids' => [],
    # Order a match's participant ("typy") list by ranking position instead of
    # alphabetically, so the standings are easy to read off after a match. Opt-in.
    'match_order_by_ranking' => false,
    # Show three naive benchmark "players" (always-favourite / always-underdog /
    # always-draw) interleaved in the ranking, to compare against. Opt-in.
    'virtual_players' => false
  }.freeze

  # Allowed values for the `theme` setting. Anything else falls back to 'light'.
  THEMES = %w[light dark auto].freeze

  # Settings we surface a "Włączone przez N osób" count for on the settings screen.
  # The push sub-toggles are excluded: they default on, so a raw `= 'true'` count
  # would be meaningless for them.
  COUNTED_SETTINGS = %w[drzewko_mode bet_lock push_enabled match_order_by_ranking virtual_players].freeze

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
    end.merge(
      # `theme` isn't a boolean: it counts users who turned dark mode on at all,
      # i.e. either 'dark' (always) or 'auto' (by the clock).
      'theme' => where("settings ->> 'theme' IN (?, ?)", 'dark', 'auto').count
    )
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

  def match_order_by_ranking?
    settings_with_defaults['match_order_by_ranking'] == true
  end

  def virtual_players?
    settings_with_defaults['virtual_players'] == true
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

  # Colour theme preference ('light' | 'dark' | 'auto'). Guards against a stale or
  # malformed value in the jsonb bag by falling back to the default.
  def theme
    value = settings_with_defaults['theme']
    THEMES.include?(value) ? value : 'light'
  end

  # IDs of the users this user starred as favourites. Coerces the stored jsonb to a
  # plain array of integers so a malformed value (e.g. nil or strings) can't break
  # the ranking/match views that highlight these users.
  def favorite_user_ids
    Array(settings_with_defaults['favorite_user_ids']).map(&:to_i)
  end
end
