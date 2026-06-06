package pl.typerek.web.dto;

/** Odds for the six bet types (any may be null before they are set). */
public record OddsDto(Double winA, Double tie, Double winB, Double winTieA, Double winTieB, Double notTie) {
}
