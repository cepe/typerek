package pl.typerek.web.dto;

import pl.typerek.domain.BetType;

/** A participant's bet on a started match ({@code result} is null when they did not bet). */
public record ParticipantDto(UserRefDto user, BetType result) {
}
