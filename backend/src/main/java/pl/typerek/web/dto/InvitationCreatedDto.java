package pl.typerek.web.dto;

/** Result of creating / resending an invitation: the user, the token and a ready link. */
public record InvitationCreatedDto(UserDto user, String token, String url) {
}
