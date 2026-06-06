package pl.typerek.config;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import pl.typerek.domain.Match;
import pl.typerek.domain.User;
import pl.typerek.repo.MatchRepository;
import pl.typerek.repo.UserRepository;

/**
 * Dev-only convenience seeding (admin + a few sample matches), enabled with
 * {@code APP_SEED=true}. Never runs against a non-empty database, so it is safe to
 * leave off in production where the schema is already populated.
 */
@Component
@ConditionalOnProperty(name = "app.seed", havingValue = "true")
@RequiredArgsConstructor
public class DevSeeder implements ApplicationRunner {

    private final UserRepository users;
    private final MatchRepository matches;
    private final PasswordEncoder passwordEncoder;

    @Value("${TYPEREK_ADMIN_USERNAME:admin}")
    private String adminUsername;

    @Value("${TYPEREK_ADMIN_PASSWORD:password1!}")
    private String adminPassword;

    @Override
    public void run(ApplicationArguments args) {
        if (users.count() > 0) {
            return;
        }

        User admin = new User();
        admin.setUsername(adminUsername);
        admin.setPasswordDigest(passwordEncoder.encode(adminPassword));
        admin.setAdmin(true);
        admin.setInvitationAcceptedAt(LocalDateTime.now(ZoneOffset.UTC));
        users.save(admin);

        matches.save(sampleMatch("Polska", "Niemcy", LocalDateTime.now(ZoneOffset.UTC).plusDays(2)));
        matches.save(sampleMatch("Hiszpania", "Włochy", LocalDateTime.now(ZoneOffset.UTC).plusDays(3)));
        matches.save(sampleMatch("Brazylia", "Argentyna", LocalDateTime.now(ZoneOffset.UTC).plusDays(5)));
    }

    private Match sampleMatch(String teamA, String teamB, LocalDateTime start) {
        Match match = new Match();
        match.setTeamA(teamA);
        match.setTeamB(teamB);
        match.setStart(start);
        match.setWinA(2.10);
        match.setTie(3.20);
        match.setWinB(2.90);
        match.setWinTieA(1.30);
        match.setWinTieB(1.55);
        match.setNotTie(1.45);
        return match;
    }
}
