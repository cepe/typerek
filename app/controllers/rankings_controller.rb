# frozen_string_literal: true

# Kontroler obsluguje podglad rankingu uzytkownikow
class RankingsController < ApplicationController
  def show
    @ranking = Typerek::Ranking::Query.new.call
  end
end
