package pl.typerek;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import pl.typerek.domain.User;

class AuthApiTest extends IntegrationTest {

    @Test
    void loginReturnsTokenAndUserForValidCredentials() throws Exception {
        User user = user("alice", true, false, "secret123");

        mvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"alice\",\"password\":\"secret123\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andExpect(jsonPath("$.user.id").value(user.getId()))
                .andExpect(jsonPath("$.user.username").value("alice"))
                .andExpect(jsonPath("$.user.admin").value(false))
                .andExpect(jsonPath("$.user.standing").isMap());
    }

    @Test
    void loginRejectsWrongPassword() throws Exception {
        user("alice", true, false, "secret123");

        mvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"alice\",\"password\":\"wrong\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error.code").value("invalid_credentials"));
    }

    @Test
    void loginRejectsUnknownUsername() throws Exception {
        mvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"ghost\",\"password\":\"secret123\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error.code").value("invalid_credentials"));
    }

    @Test
    void issuedTokenAuthenticatesSubsequentRequests() throws Exception {
        user("alice", true, false, "secret123");

        String token = read(mvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"alice\",\"password\":\"secret123\"}"))
                .andExpect(status().isOk()).andReturn()).get("token").asText();

        mvc.perform(get("/api/v1/me").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("alice"));
    }

    @Test
    void rejectsMalformedToken() throws Exception {
        mvc.perform(get("/api/v1/me").header("Authorization", "Bearer not-a-jwt"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void rejectsExpiredToken() throws Exception {
        User user = activeUser("amy");
        String expired = jwt.createAccessToken(user, Instant.now().minus(25, ChronoUnit.HOURS));

        mvc.perform(get("/api/v1/me").header("Authorization", "Bearer " + expired))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void rejectsTokenForRemovedUser() throws Exception {
        User user = activeUser("amy");
        String token = jwt.createAccessToken(user);
        users.deleteById(user.getId());

        mvc.perform(get("/api/v1/me").header("Authorization", "Bearer " + token))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void logoutRequiresAuthentication() throws Exception {
        mvc.perform(post("/api/v1/auth/logout"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void logoutReturnsNoContentWhenAuthenticated() throws Exception {
        User user = activeUser("amy");

        mvc.perform(post("/api/v1/auth/logout").header("Authorization", bearer(user)))
                .andExpect(status().isNoContent());
    }
}
