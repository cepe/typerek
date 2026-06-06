package pl.typerek;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import pl.typerek.domain.User;

class ProfileApiTest extends IntegrationTest {

    @Test
    void returnsCurrentUserWithStanding() throws Exception {
        User user = activeUser("amy");

        mvc.perform(get("/api/v1/me").header("Authorization", bearer(user)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(user.getId()))
                .andExpect(jsonPath("$.username").value("amy"))
                .andExpect(jsonPath("$.admin").value(false))
                .andExpect(jsonPath("$.standing.rank").value(1));
    }

    @Test
    void returnsUnauthorizedWithoutToken() throws Exception {
        mvc.perform(get("/api/v1/me"))
                .andExpect(status().isUnauthorized());
    }
}
