# frozen_string_literal: true

class CreateMatchReminders < ActiveRecord::Migration[7.1]
  def change
    create_table :match_reminders do |t|
      t.references :user, null: false, foreign_key: true
      t.references :match, null: false, foreign_key: true
      # Hours-before-kickoff window this reminder covered: 24, 6 or 1. The unique
      # index below makes the hourly reminder job idempotent (never double-sends).
      t.integer :window_hours, null: false

      t.timestamps
    end

    add_index :match_reminders, %i[user_id match_id window_hours], unique: true
  end
end
