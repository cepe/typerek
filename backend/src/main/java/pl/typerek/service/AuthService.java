package pl.typerek.service;

import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import pl.typerek.domain.User;
import pl.typerek.repo.UserRepository;
import pl.typerek.security.JwtService;
import pl.typerek.web.dto.AuthResultDto;
import pl.typerek.web.dto.CurrentUserDto;
import pl.typerek.web.dto.StandingDto;
import pl.typerek.web.error.ApiException;

@Service
@RequiredArgsConstructor
public class AuthService {

    // A valid bcrypt hash used to equalize timing when the user is unknown, so
    // login does not leak which usernames exist (mirrors authenticate_by).
    private static final String DUMMY_HASH = "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy";

    private final UserRepository users;
    private final RankingService ranking;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    @Value("${app.discord-url:}")
    private String discordUrl;

    public AuthResultDto login(String username, String password) {
        Optional<User> found = username == null ? Optional.empty() : users.findByUsername(username);
        boolean ok = found
                .map(user -> user.getPasswordDigest() != null
                        && password != null
                        && passwordEncoder.matches(password, user.getPasswordDigest()))
                .orElse(false);
        if (!ok) {
            if (found.isEmpty() || found.get().getPasswordDigest() == null) {
                passwordEncoder.matches(password == null ? "" : password, DUMMY_HASH);
            }
            throw ApiException.invalidCredentials();
        }
        return authResult(found.get());
    }

    public AuthResultDto authResult(User user) {
        return new AuthResultDto(jwtService.createAccessToken(user), currentUser(user));
    }

    public CurrentUserDto currentUser(User user) {
        StandingDto standing = ranking.entryFor(user)
                .map(entry -> new StandingDto(entry.position(), entry.points()))
                .orElse(null);
        String discord = (discordUrl == null || discordUrl.isBlank()) ? null : discordUrl;
        return new CurrentUserDto(user.getId(), user.getUsername(), user.isAdmin(), standing, discord);
    }
}
