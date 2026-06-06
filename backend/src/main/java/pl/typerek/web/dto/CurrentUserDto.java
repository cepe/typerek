package pl.typerek.web.dto;

/** The signed-in user plus their ranking standing and the (auth-gated) Discord link. */
public record CurrentUserDto(Long id, String username, boolean admin, StandingDto standing, String discordUrl) {
}
