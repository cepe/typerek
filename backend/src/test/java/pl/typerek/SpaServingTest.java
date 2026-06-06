package pl.typerek;

import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import pl.typerek.domain.User;

/**
 * The Java app serves the React SPA shell for client-side routes (same origin, no
 * CORS). The key regression: invite links are {@code /invitations/<jwt>} and the JWT
 * contains dots, so the shell must still be served — a naive "path has a dot → 404"
 * rule (which the Rails token never tripped) breaks the invitation flow.
 */
class SpaServingTest extends IntegrationTest {

    @Test
    void servesShellForInvitationLinkWithDottedJwt() throws Exception {
        mvc.perform(get("/invitations/aaa.bbb.ccc"))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith("text/html"))
                .andExpect(content().string(containsString("SPA_SHELL_MARKER")));
    }

    @Test
    void servesShellForClientSideRoutes() throws Exception {
        // The resource handler returns index.html directly for these. ("/" is served
        // by Spring Boot's welcome-page forward, which MockMvc does not execute — it
        // is covered by the live-container smoke test instead.)
        for (String route : new String[]{"/matches", "/ranking", "/users/5"}) {
            mvc.perform(get(route))
                    .andExpect(status().isOk())
                    .andExpect(content().string(containsString("SPA_SHELL_MARKER")));
        }
    }

    @Test
    void unknownApiPathReturns404EnvelopeForAuthenticatedUser() throws Exception {
        // Unauthenticated, security answers 401 first; for a signed-in user an unknown
        // API path falls through to our 404 envelope (like Rails' routing 404).
        User user = activeUser("amy");
        mvc.perform(get("/api/v1/does-not-exist").header("Authorization", bearer(user)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error.code").value("not_found"));
    }

    @Test
    void missingBuildAssetIsNotTheShell() throws Exception {
        mvc.perform(get("/assets/missing-deadbeef.js"))
                .andExpect(status().isNotFound());
    }
}
