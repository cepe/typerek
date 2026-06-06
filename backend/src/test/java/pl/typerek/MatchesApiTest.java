package pl.typerek;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import pl.typerek.domain.BetType;
import pl.typerek.domain.Match;
import pl.typerek.domain.User;

class MatchesApiTest extends IntegrationTest {

    private LocalDateTime past() {
        return LocalDateTime.now(ZoneOffset.UTC).minusDays(1);
    }

    @Test
    void indexSplitsMatchesAndEmbedsMyAnswerAndOdds() throws Exception {
        Match future = match(m -> { /* default: future, no results */ });
        Match finished = match(m -> {
            m.setStart(past());
            m.setResultA(1);
            m.setResultB(0);
        });
        User user = activeUser("amy");
        answer(future, user, BetType.WIN_A);

        JsonNode body = read(mvc.perform(get("/api/v1/matches").header("Authorization", bearer(user)))
                .andExpect(status().isOk()).andReturn());

        JsonNode mine = findById(body.get("not_finished"), future.getId());
        assertTrue(mine != null, "future match should be in not_finished");
        assertEquals("win_a", mine.get("my_answer").asText());
        assertTrue(mine.get("odds").has("win_a"));
        assertTrue(findById(body.get("finished"), finished.getId()) != null,
                "finished match should be in finished");
    }

    @Test
    void showIncludesParticipantsOnceStarted() throws Exception {
        Match match = match(m -> m.setStart(past())); // started, no results
        User user = activeUser("amy");
        User other = activeUser("zzz");
        answer(match, other, BetType.TIE);

        JsonNode body = read(mvc.perform(get("/api/v1/matches/" + match.getId())
                        .header("Authorization", bearer(user)))
                .andExpect(status().isOk()).andReturn());

        assertTrue(body.get("started").asBoolean());
        JsonNode entry = null;
        for (JsonNode p : body.get("participants")) {
            if (p.get("user").get("id").asLong() == other.getId()) {
                entry = p;
            }
        }
        assertTrue(entry != null, "other participant present");
        assertEquals("tie", entry.get("result").asText());
    }

    @Test
    void showOmitsParticipantsForFutureMatch() throws Exception {
        Match match = match(m -> { /* default future */ });
        User user = activeUser("amy");

        JsonNode body = read(mvc.perform(get("/api/v1/matches/" + match.getId())
                        .header("Authorization", bearer(user)))
                .andExpect(status().isOk()).andReturn());

        assertFalse(body.get("started").asBoolean());
        assertFalse(body.has("participants"));
    }

    @Test
    void betOnFutureMatchIsRecorded() throws Exception {
        Match match = match(m -> { /* future */ });
        User user = activeUser("amy");

        mvc.perform(put("/api/v1/matches/" + match.getId() + "/bet")
                        .header("Authorization", bearer(user))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"result\":\"win_tie_a\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.match_id").value(match.getId()))
                .andExpect(jsonPath("$.result").value("win_tie_a"));
    }

    @Test
    void betOnStartedMatchIsRejected() throws Exception {
        Match match = match(m -> m.setStart(past()));
        User user = activeUser("amy");

        mvc.perform(put("/api/v1/matches/" + match.getId() + "/bet")
                        .header("Authorization", bearer(user))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"result\":\"win_a\"}"))
                .andExpect(status().isUnprocessableEntity());
    }

    @Test
    void adminUpdatesMatch() throws Exception {
        Match match = match(m -> { /* future */ });
        User admin = adminUser("admin");

        mvc.perform(put("/api/v1/matches/" + match.getId())
                        .header("Authorization", bearer(admin))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"team_a\":\"Polska\",\"win_a\":1.5}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.team_a").value("Polska"))
                .andExpect(jsonPath("$.odds.win_a").value(1.5));
    }

    @Test
    void adminUpdateReturns422WithFieldErrors() throws Exception {
        Match match = match(m -> { });
        User admin = adminUser("admin");

        mvc.perform(put("/api/v1/matches/" + match.getId())
                        .header("Authorization", bearer(admin))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"team_a\":\"\"}"))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.error.fields.team_a").exists());
    }

    @Test
    void matchUpdateForbiddenForNonAdmin() throws Exception {
        Match match = match(m -> { });
        User user = activeUser("amy");

        mvc.perform(put("/api/v1/matches/" + match.getId())
                        .header("Authorization", bearer(user))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"team_a\":\"Polska\"}"))
                .andExpect(status().isForbidden());
    }
}
