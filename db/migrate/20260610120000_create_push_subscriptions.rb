# frozen_string_literal: true

class CreatePushSubscriptions < ActiveRecord::Migration[7.1]
  def change
    create_table :push_subscriptions do |t|
      t.references :user, null: false, foreign_key: true
      # The push service endpoint URL identifies the subscription; it is unique per
      # browser/device and is what we POST messages to.
      t.string :endpoint, null: false
      # The two keys the browser handed us at subscribe time, needed to encrypt the
      # payload (RFC 8291). p256dh is the client public key, auth is the auth secret.
      t.string :p256dh, null: false
      t.string :auth, null: false
      # Free-text label so the user/admin can tell devices apart later if needed.
      t.string :user_agent

      t.timestamps
    end

    add_index :push_subscriptions, :endpoint, unique: true
  end
end