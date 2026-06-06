package pl.typerek;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import pl.typerek.domain.User;

class UsersApiTest extends IntegrationTest {

    @Test
    void listsUsersForAdmin() throws Exception {
        User admin = adminUser("admin");

        mvc.perform(get("/api/v1/users").header("Authorization", bearer(admin)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    @Test
    void userListForbiddenForNonAdmin() throws Exception {
        User member = activeUser("member");

        mvc.perform(get("/api/v1/users").header("Authorization", bearer(member)))
                .andExpect(status().isForbidden());
    }

    @Test
    void createsInvitationAndReturnsActivationLink() throws Exception {
        User admin = adminUser("admin");

        JsonNode body = read(mvc.perform(post("/api/v1/users").header("Authorization", bearer(admin))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"username\":\"newbie\"}"))
                .andExpect(status().isCreated()).andReturn());

        org.junit.jupiter.api.Assertions.assertEquals("newbie", body.get("user").get("username").asText());
        assertFalse(body.get("user").get("active").asBoolean());
        assertTrue(body.get("token").asText().length() > 0);
        assertTrue(body.get("url").asText().contains(body.get("token").asText()));
    }

    @Test
    void createReturns422ForBlankUsername() throws Exception {
        User admin = adminUser("admin");

        mvc.perform(post("/api/v1/users").header("Authorization", bearer(admin))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"username\":\"\"}"))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.error.fields.username").exists());
    }

    @Test
    void togglesConfirmationFlag() throws Exception {
        User admin = adminUser("admin");
        User target = user("target", true, false, "secret123");

        mvc.perform(patch("/api/v1/users/" + target.getId() + "/fin").header("Authorization", bearer(admin)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.fin").value(true));
    }

    @Test
    void removesUser() throws Exception {
        User admin = adminUser("admin");
        User target = activeUser("target");

        mvc.perform(delete("/api/v1/users/" + target.getId()).header("Authorization", bearer(admin)))
                .andExpect(status().isNoContent());
        assertFalse(users.existsById(target.getId()));
    }

    @Test
    void returnsProfileForAnySignedInUser() throws Exception {
        User member = activeUser("member");
        User target = activeUser("target");

        mvc.perform(get("/api/v1/users/" + target.getId()).header("Authorization", bearer(member)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.user.username").value("target"))
                .andExpect(jsonPath("$.started_matches").isArray());
    }
}
