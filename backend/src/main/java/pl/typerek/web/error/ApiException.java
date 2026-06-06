package pl.typerek.web.error;

import java.util.List;
import java.util.Map;
import lombok.Getter;
import org.springframework.http.HttpStatus;

/** Carries the HTTP status, error code and (optional) per-field errors of the API. */
@Getter
public class ApiException extends RuntimeException {

    private final HttpStatus status;
    private final String code;
    private final transient Map<String, List<String>> fields;

    public ApiException(HttpStatus status, String code, String message, Map<String, List<String>> fields) {
        super(message);
        this.status = status;
        this.code = code;
        this.fields = fields;
    }

    public ApiException(HttpStatus status, String code, String message) {
        this(status, code, message, null);
    }

    public static ApiException unauthorized() {
        return new ApiException(HttpStatus.UNAUTHORIZED, "unauthorized", "Wymagane uwierzytelnienie");
    }

    public static ApiException invalidCredentials() {
        return new ApiException(HttpStatus.UNAUTHORIZED, "invalid_credentials", "Niepoprawny login lub hasło");
    }

    public static ApiException forbidden() {
        return new ApiException(HttpStatus.FORBIDDEN, "forbidden", "Brak uprawnień");
    }

    public static ApiException notFound() {
        return new ApiException(HttpStatus.NOT_FOUND, "not_found", "Nie znaleziono zasobu");
    }

    public static ApiException invalidToken() {
        return new ApiException(HttpStatus.NOT_FOUND, "invalid_token", "Nieprawidłowy lub wygasły token");
    }

    public static ApiException unprocessable(String message) {
        return new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "unprocessable", message);
    }

    public static ApiException validationFailed(String message, Map<String, List<String>> fields) {
        return new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "validation_failed", message, fields);
    }
}
