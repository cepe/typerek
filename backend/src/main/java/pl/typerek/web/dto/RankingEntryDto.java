package pl.typerek.web.dto;

public record RankingEntryDto(int position, UserRefDto user, double points, int accuracy) {
}
