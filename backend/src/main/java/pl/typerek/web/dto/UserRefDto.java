package pl.typerek.web.dto;

/** A minimal user reference: {@code { id, username }}. */
public record UserRefDto(Long id, String username) {
}
