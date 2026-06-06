package pl.typerek.web;

import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/** Drop-in replacement for the Rails {@code /up} health endpoint (compose healthcheck). */
@RestController
public class HealthController {

    @GetMapping(value = "/up", produces = MediaType.TEXT_PLAIN_VALUE)
    public String up() {
        return "OK";
    }
}
