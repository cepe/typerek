package pl.typerek;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import pl.typerek.domain.BetType;
import pl.typerek.domain.Match;
import pl.typerek.domain.User;

class RankingApiTest extends IntegrationTest {

    @Test
    void returnsOrderedEntriesWithPositionPointsAndAccuracy() throws Exception {
        Match match = match(m -> {
            m.setResultA(1);
            m.setResultB(0); // winner_a
            m.setWinA(5.0);
        });
        User amy = activeUser("amy");
        activeUser("bob");
        answer(match, amy, BetType.WIN_A);

        mvc.perform(get("/api/v1/ranking").header("Authorization", bearer(amy)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].position").value(1))
                .andExpect(jsonPath("$[0].points").value(5.0))
                .andExpect(jsonPath("$[0].accuracy").value(1))
                .andExpect(jsonPath("$[0].user.username").value("amy"));
    }
}
