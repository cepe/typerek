package pl.typerek.service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import pl.typerek.web.error.ApiException;

/** Small helper for collecting Rails-style per-field validation errors. */
final class Validations {

    private Validations() {
    }

    static void add(Map<String, List<String>> fields, String field, String message) {
        fields.computeIfAbsent(field, key -> new ArrayList<>()).add(message);
    }

    static void throwIfAny(Map<String, List<String>> fields) {
        if (!fields.isEmpty()) {
            String message = fields.values().stream()
                    .flatMap(List::stream)
                    .collect(Collectors.joining(", "));
            throw ApiException.validationFailed(message, fields);
        }
    }
}
