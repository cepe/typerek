package pl.typerek.config;

import java.io.IOException;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.Resource;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import org.springframework.web.servlet.resource.PathResourceResolver;

/**
 * Serves the built React SPA from {@code classpath:/static/} on the same origin as
 * the API (no CORS). Real files (hashed JS/CSS, flags) are served directly; any other
 * non-API, dot-less path falls back to {@code index.html} so the client-side router
 * can take over — mirroring the Rails {@code SpaController} + routes fallback.
 */
@Component
public class WebConfig implements WebMvcConfigurer {

    private static final Resource INDEX = new ClassPathResource("static/index.html");

    @Override
    public void addResourceHandlers(@NonNull ResourceHandlerRegistry registry) {
        registry.addResourceHandler("/**")
                .addResourceLocations("classpath:/static/")
                .resourceChain(true)
                .addResolver(new PathResourceResolver() {
                    @Override
                    protected Resource getResource(@NonNull String resourcePath, @NonNull Resource location)
                            throws IOException {
                        Resource requested = location.createRelative(resourcePath);
                        if (requested.exists() && requested.isReadable()) {
                            return requested;
                        }
                        return spaFallback(resourcePath);
                    }
                });
    }

    private Resource spaFallback(String resourcePath) {
        // Never shadow the API/health/actuator routes, and let genuinely missing
        // build assets 404 instead of returning the shell. Everything else is a
        // client-side route → serve the SPA shell. We can't use a "contains a dot"
        // heuristic here because invite tokens are JWTs (e.g. /invitations/aaa.bbb.ccc).
        if (resourcePath.startsWith("api/") || resourcePath.equals("api")
                || resourcePath.startsWith("up") || resourcePath.startsWith("actuator")
                || resourcePath.startsWith("assets/")) {
            return null;
        }
        return INDEX;
    }
}
