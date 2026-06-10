# frozen_string_literal: true

class AddLockedToAnswers < ActiveRecord::Migration[7.1]
  def change
    add_column :answers, :locked, :boolean, default: false, null: false
  end
end
