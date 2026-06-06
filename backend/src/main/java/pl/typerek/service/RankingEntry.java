package pl.typerek.service;

import pl.typerek.domain.User;

/** A single ranking row: a user with their computed points, accuracy and position. */
public record RankingEntry(User user, double points, int accuracy, int position) {
}
