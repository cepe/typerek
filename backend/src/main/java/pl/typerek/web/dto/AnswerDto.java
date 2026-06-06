package pl.typerek.web.dto;

import pl.typerek.domain.BetType;

/** The signed-in user's bet on a match: {@code { match_id, result }}. */
public record AnswerDto(Long matchId, BetType result) {
}
