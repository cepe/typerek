package pl.typerek.web.error;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.resource.NoResourceFoundException;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(ApiException.class)
    public ResponseEntity<ErrorResponse> handleApi(ApiException ex) {
        return ResponseEntity.status(ex.getStatus())
                .body(ErrorResponse.of(ex.getCode(), ex.getMessage(), ex.getFields()));
    }

    /** Thrown by method security (@PreAuthorize) for an authenticated-but-not-allowed user. */
    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ErrorResponse> handleAccessDenied(AccessDeniedException ex) {
        return ResponseEntity.status(403).body(ErrorResponse.of("forbidden", "Brak uprawnień", null));
    }

    /**
     * An unmatched route or method. Rails' router returns 404 for any path/method it
     * does not recognise (there is no DELETE /matches, etc.), so we mirror that with
     * our 404 envelope instead of Spring's default 405/whitelabel.
     */
    @ExceptionHandler({HttpRequestMethodNotSupportedException.class, NoResourceFoundException.class})
    public ResponseEntity<ErrorResponse> handleNotFound(Exception ex) {
        return ResponseEntity.status(404).body(ErrorResponse.of("not_found", "Nie znaleziono zasobu", null));
    }
}
