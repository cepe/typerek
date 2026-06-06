package pl.typerek;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import pl.typerek.domain.BetType;
import pl.typerek.domain.Match;
import pl.typerek.domain.User;

/** Locks the security rules: auth required, bet visibility, bet locking, admin-only. */
class PermissionsApiTest extends IntegrationTest {

    private LocalDateTime past() {
        return LocalDateTime.now(ZoneOffset.UTC).minusDays(1);
    }

    @Test
    void authenticationIsRequired() throws Exception {
        for (String path : new String[]{"/api/v1/me", "/api/v1/matches", "/api/v1/ranking", "/api/v1/users"}) {
            mvc.perform(get(path)).andExpect(status().isUnauthorized());
        }
    }

    @Test
    void neverExposesOthersBeforeStartAndShowsOnlyCallersBet() throws Exception {
        Match match = match(m -> { /* future, no results */ });
        User me = activeUser("me");
        User other = activeUser("other");
        answer(match, me, BetType.WIN_A);
        answer(match, other, BetType.WIN_B);

        JsonNode mineView = read(mvc.perform(get("/api/v1/matches/" + match.getId())
                .header("Authorization", bearer(me))).andExpect(status().isOk()).andReturn());
        assertFalse(mineView.get("started").asBoolean());
        assertFalse(mineView.has("participants"));
        assertEquals("win_a", mineView.get("my_answer").asText());

        JsonNode otherView = read(mvc.perform(get("/api/v1/matches/" + match.getId())
                .header("Authorization", bearer(other))).andExpect(status().isOk()).andReturn());
        assertFalse(otherView.has("participants"));
        assertEquals("win_b", otherView.get("my_answer").asText());
    }

    @Test
    void doesNotLeakOtherBetsThroughTheList() throws Exception {
        Match match = match(m -> { });
        User me = activeUser("me");
        User other = activeUser("other");
        answer(match, me, BetType.WIN_A);
        answer(match, other, BetType.WIN_B);

        JsonNode body = read(mvc.perform(get("/api/v1/matches")
                .header("Authorization", bearer(me))).andExpect(status().isOk()).andReturn());
        JsonNode listed = findById(body.get("not_finished"), match.getId());
        assertEquals("win_a", listed.get("my_answer").asText());
        assertFalse(listed.has("participants"));
    }

    @Test
    void exposesEveryParticipantBetOnceStarted() throws Exception {
        Match match = match(m -> m.setStart(past()));
        User me = activeUser("me");
        User other = activeUser("other");
        answer(match, me, BetType.WIN_A);
        answer(match, other, BetType.WIN_B);

        JsonNode body = read(mvc.perform(get("/api/v1/matches/" + match.getId())
                .header("Authorization", bearer(me))).andExpect(status().isOk()).andReturn());
        assertTrue(body.get("started").asBoolean());

        String meBet = null;
        String otherBet = null;
        for (JsonNode p : body.get("participants")) {
            String username = p.get("user").get("username").asText();
            if (username.equals("me")) {
                meBet = p.get("result").asText();
            } else if (username.equals("other")) {
                otherBet = p.get("result").asText();
            }
        }
        assertEquals("win_a", meBet);
        assertEquals("win_b", otherBet);
    }

    @Test
    void betIsAllowedBeforeStart() throws Exception {
        Match match = match(m -> { });
        User me = activeUser("me");

        mvc.perform(put("/api/v1/matches/" + match.getId() + "/bet").header("Authorization", bearer(me))
                .contentType(MediaType.APPLICATION_JSON).content("{\"result\":\"tie\"}"))
                .andExpect(status().isOk());
        assertEquals(BetType.TIE,
                answers.findByMatchIdAndUserId(match.getId().intValue(), me.getId().intValue()).orElseThrow().getResult());
    }

    @Test
    void betIsRejectedOnceStartedAndNotPersisted() throws Exception {
        Match match = match(m -> m.setStart(past()));
        User me = activeUser("me");

        mvc.perform(put("/api/v1/matches/" + match.getId() + "/bet").header("Authorization", bearer(me))
                .contentType(MediaType.APPLICATION_JSON).content("{\"result\":\"tie\"}"))
                .andExpect(status().isUnprocessableEntity());
        assertTrue(answers.findByMatchIdAndUserId(match.getId().intValue(), me.getId().intValue()).isEmpty());
    }

    @Test
    void betIsRejectedAfterFinished() throws Exception {
        Match match = match(m -> {
            m.setStart(past());
            m.setResultA(1);
            m.setResultB(0);
        });
        User me = activeUser("me");

        mvc.perform(put("/api/v1/matches/" + match.getId() + "/bet").header("Authorization", bearer(me))
                .contentType(MediaType.APPLICATION_JSON).content("{\"result\":\"tie\"}"))
                .andExpect(status().isUnprocessableEntity());
    }

    @Test
    void doesNotModifyExistingBetAfterStart() throws Exception {
        Match match = match(m -> { });
        User me = activeUser("me");
        answer(match, me, BetType.WIN_A);
        match.setStart(past()); // kickoff
        matches.save(match);

        mvc.perform(put("/api/v1/matches/" + match.getId() + "/bet").header("Authorization", bearer(me))
                .contentType(MediaType.APPLICATION_JSON).content("{\"result\":\"win_b\"}"))
                .andExpect(status().isUnprocessableEntity());
        assertEquals(BetType.WIN_A,
                answers.findByMatchIdAndUserId(match.getId().intValue(), me.getId().intValue()).orElseThrow().getResult());
    }

    @Test
    void canOnlyBetAsTheCaller() throws Exception {
        Match match = match(m -> { });
        User me = activeUser("me");
        User other = activeUser("other");

        mvc.perform(put("/api/v1/matches/" + match.getId() + "/bet").header("Authorization", bearer(me))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"result\":\"tie\",\"user_id\":" + other.getId() + "}"))
                .andExpect(status().isOk());

        assertEquals(BetType.TIE,
                answers.findByMatchIdAndUserId(match.getId().intValue(), me.getId().intValue()).orElseThrow().getResult());
        assertTrue(answers.findByMatchIdAndUserId(match.getId().intValue(), other.getId().intValue()).isEmpty());
    }

    @Test
    void matchEditForbiddenForRegularUser() throws Exception {
        Match match = match(m -> { });
        User me = activeUser("me");

        mvc.perform(put("/api/v1/matches/" + match.getId()).header("Authorization", bearer(me))
                .contentType(MediaType.APPLICATION_JSON).content("{\"team_a\":\"Hacked\"}"))
                .andExpect(status().isForbidden());
        assertEquals("Polska", matches.findById(match.getId()).orElseThrow().getTeamA());
    }

    @Test
    void matchDeletionIsNotExposed() throws Exception {
        Match match = match(m -> { });
        User me = activeUser("me");

        mvc.perform(delete("/api/v1/matches/" + match.getId()).header("Authorization", bearer(me)))
                .andExpect(status().isNotFound());
        assertTrue(matches.existsById(match.getId()));
    }

    @Test
    void userManagementForbiddenForRegularUser() throws Exception {
        User me = activeUser("me");
        User other = activeUser("other");

        mvc.perform(get("/api/v1/users").header("Authorization", bearer(me))).andExpect(status().isForbidden());
        mvc.perform(post("/api/v1/users").header("Authorization", bearer(me))
                .contentType(MediaType.APPLICATION_JSON).content("{\"username\":\"x\"}")).andExpect(status().isForbidden());
        mvc.perform(patch("/api/v1/users/" + other.getId() + "/fin").header("Authorization", bearer(me)))
                .andExpect(status().isForbidden());
        mvc.perform(post("/api/v1/users/" + other.getId() + "/resend-invitation").header("Authorization", bearer(me)))
                .andExpect(status().isForbidden());
        mvc.perform(delete("/api/v1/users/" + other.getId()).header("Authorization", bearer(me)))
                .andExpect(status().isForbidden());
        assertTrue(users.existsById(other.getId()));
    }

    @Test
    void userProfileShowsBetsOnlyOnStartedMatches() throws Exception {
        Match future = match(m -> { });
        Match started = match(m -> m.setStart(past()));
        User me = activeUser("me");
        User other = activeUser("other");
        answer(future, other, BetType.WIN_A);
        answer(started, other, BetType.WIN_B);

        JsonNode body = read(mvc.perform(get("/api/v1/users/" + other.getId()).header("Authorization", bearer(me)))
                .andExpect(status().isOk()).andReturn());

        boolean hasStarted = false;
        boolean hasFuture = false;
        for (JsonNode m : body.get("started_matches")) {
            long id = m.get("id").asLong();
            if (id == started.getId()) {
                hasStarted = true;
                assertEquals("win_b", m.get("answer").asText());
            }
            if (id == future.getId()) {
                hasFuture = true;
            }
        }
        assertTrue(hasStarted);
        assertFalse(hasFuture);
    }
}
