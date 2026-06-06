package pl.typerek.web.dto;

/** The bet type is taken as a raw string and parsed in the service, so an unknown
 * value yields the same 422 "Nieprawidłowy typ." as the Rails handler. */
public record BetRequest(String result) {
}
