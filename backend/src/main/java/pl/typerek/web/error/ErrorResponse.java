package pl.typerek.web.error;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.util.List;
import java.util.Map;

/** The consistent error envelope: {@code { "error": { code, message, fields? } }}. */
public record ErrorResponse(Body error) {

    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record Body(String code, String message, Map<String, List<String>> fields) {
    }

    public static ErrorResponse of(String code, String message, Map<String, List<String>> fields) {
        return new ErrorResponse(new Body(code, message, fields));
    }
}
