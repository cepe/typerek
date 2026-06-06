package pl.typerek.web.dto;

/** A user as shown on the admin list. */
public record UserDto(Long id, String username, boolean admin, boolean active, boolean fin, String invitedBy) {
}
