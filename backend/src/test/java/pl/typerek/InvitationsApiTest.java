package pl.typerek;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import pl.typerek.domain.User;
import pl.typerek.service.InvitationService;

class InvitationsApiTest extends IntegrationTest {

    @Autowired
    private InvitationService invitationService;

    private User invitedUser() {
        User admin = adminUser("admin");
        User invited = new User();
        invited.setUsername("invitee");
        invited.setInvitedById(admin.getId().intValue());
        invited.setInvitedByType("User");
        return users.save(invited);
    }

    @Test
    void returnsUsernameForValidToken() throws Exception {
        String token = invitationService.tokenFor(invitedUser());

        mvc.perform(get("/api/v1/invitations/" + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("invitee"));
    }

    @Test
    void returns404ForBadToken() throws Exception {
        mvc.perform(get("/api/v1/invitations/garbage"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error.code").value("invalid_token"));
    }

    @Test
    void acceptSetsPasswordActivatesAndReturnsJwt() throws Exception {
        User invited = invitedUser();
        String token = invitationService.tokenFor(invited);

        mvc.perform(post("/api/v1/invitations/" + token + "/accept").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"password\":\"secret123\",\"password_confirmation\":\"secret123\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andExpect(jsonPath("$.user.username").value("invitee"));

        assertTrue(users.findById(invited.getId()).orElseThrow().getInvitationAcceptedAt() != null);
    }

    @Test
    void acceptReturns422WhenPasswordsDoNotMatch() throws Exception {
        String token = invitationService.tokenFor(invitedUser());

        mvc.perform(post("/api/v1/invitations/" + token + "/accept").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"password\":\"secret123\",\"password_confirmation\":\"nope\"}"))
                .andExpect(status().isUnprocessableEntity());
    }

    @Test
    void acceptReturns404ForBadToken() throws Exception {
        mvc.perform(post("/api/v1/invitations/garbage/accept").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"password\":\"secret123\",\"password_confirmation\":\"secret123\"}"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error.code").value("invalid_token"));
    }

    @Test
    void acceptInvalidatesTokenOnceUsed() throws Exception {
        User invited = invitedUser();
        String token = invitationService.tokenFor(invited);

        mvc.perform(post("/api/v1/invitations/" + token + "/accept").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"password\":\"secret123\",\"password_confirmation\":\"secret123\"}"))
                .andExpect(status().isOk());

        mvc.perform(get("/api/v1/invitations/" + token))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error.code").value("invalid_token"));
    }

    @Test
    void acceptIssuesJwtThatAuthenticates() throws Exception {
        String token = invitationService.tokenFor(invitedUser());

        JsonNode body = read(mvc.perform(post("/api/v1/invitations/" + token + "/accept")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"password\":\"secret123\",\"password_confirmation\":\"secret123\"}"))
                .andExpect(status().isOk()).andReturn());

        mvc.perform(get("/api/v1/me").header("Authorization", "Bearer " + body.get("token").asText()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("invitee"));
    }
}
