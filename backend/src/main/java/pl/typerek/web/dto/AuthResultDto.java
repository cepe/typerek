package pl.typerek.web.dto;

/** JWT plus the signed-in user (login and invitation acceptance). */
public record AuthResultDto(String token, CurrentUserDto user) {
}
