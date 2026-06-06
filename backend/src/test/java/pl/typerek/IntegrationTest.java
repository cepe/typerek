package pl.typerek;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.function.Consumer;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.utility.DockerImageName;
import pl.typerek.domain.Answer;
import pl.typerek.domain.BetType;
import pl.typerek.domain.Match;
import pl.typerek.domain.User;
import pl.typerek.repo.AnswerRepository;
import pl.typerek.repo.MatchRepository;
import pl.typerek.repo.UserRepository;
import pl.typerek.security.JwtService;

/**
 * Base for the API contract tests. A single Postgres container (schema from
 * src/test/resources/schema.sql) is shared across all test classes; each test starts
 * from a truncated database. Mirrors the RSpec request specs + factories.
 */
@SpringBootTest
@AutoConfigureMockMvc
abstract class IntegrationTest {

    static final PostgreSQLContainer<?> POSTGRES =
            new PostgreSQLContainer<>(DockerImageName.parse("postgres:15-alpine"))
                    .withInitScript("schema.sql");

    static {
        POSTGRES.start();
    }

    @DynamicPropertySource
    static void properties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
        registry.add("app.jwt.secret", () -> "test-secret-please-change-0123456789-abcdef");
        registry.add("app.discord-url", () -> "");
    }

    @Autowired
    protected MockMvc mvc;
    @Autowired
    protected UserRepository users;
    @Autowired
    protected MatchRepository matches;
    @Autowired
    protected AnswerRepository answers;
    @Autowired
    protected PasswordEncoder encoder;
    @Autowired
    protected JwtService jwt;
    @Autowired
    protected JdbcTemplate jdbc;
    @Autowired
    protected ObjectMapper objectMapper;

    @BeforeEach
    void resetDatabase() {
        jdbc.execute("TRUNCATE answers, matches, users RESTART IDENTITY CASCADE");
    }

    // ── factories (mirror spec/factories) ───────────────────────────────────────
    protected User user(String username, boolean active, boolean admin, String rawPassword) {
        User user = new User();
        user.setUsername(username);
        if (rawPassword != null) {
            user.setPasswordDigest(encoder.encode(rawPassword));
        }
        user.setAdmin(admin);
        user.setFin(false);
        if (active) {
            user.setInvitationAcceptedAt(LocalDateTime.now(ZoneOffset.UTC));
        }
        return users.save(user);
    }

    protected User activeUser(String username) {
        return user(username, true, false, "secret123");
    }

    protected User adminUser(String username) {
        return user(username, true, true, "secret123");
    }

    protected Match match(Consumer<Match> customizer) {
        Match match = new Match();
        match.setTeamA("Polska");
        match.setTeamB("Niemcy");
        match.setStart(LocalDateTime.now(ZoneOffset.UTC).plusDays(1));
        match.setWinA(2.0);
        match.setTie(3.0);
        match.setWinB(2.5);
        match.setWinTieA(1.3);
        match.setWinTieB(1.5);
        match.setNotTie(1.4);
        customizer.accept(match);
        return matches.save(match);
    }

    protected Answer answer(Match match, User user, BetType result) {
        Answer answer = new Answer();
        answer.setMatchId(match.getId().intValue());
        answer.setUserId(user.getId().intValue());
        answer.setResult(result);
        return answers.save(answer);
    }

    protected String bearer(User user) {
        return "Bearer " + jwt.createAccessToken(user);
    }

    // ── JSON helpers ─────────────────────────────────────────────────────────────
    protected JsonNode read(MvcResult result) throws Exception {
        return objectMapper.readTree(result.getResponse().getContentAsString());
    }

    protected static JsonNode findById(JsonNode array, long id) {
        for (JsonNode node : array) {
            if (node.get("id").asLong() == id) {
                return node;
            }
        }
        return null;
    }
}
