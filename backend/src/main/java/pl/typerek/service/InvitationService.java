package pl.typerek.service;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pl.typerek.domain.User;
import pl.typerek.repo.UserRepository;
import pl.typerek.security.JwtService;
import pl.typerek.web.dto.AuthResultDto;
import pl.typerek.web.dto.InvitationInfoDto;
import pl.typerek.web.error.ApiException;

/**
 * Token-based invitation flow. The token is a JWT carrying a fingerprint of the
 * user's password digest; setting a password rotates the digest and so invalidates
 * the token — replicating Rails' {@code generates_token_for :invitation}.
 */
@Service
@RequiredArgsConstructor
public class InvitationService {

    private final UserRepository users;
    private final JwtService jwtService;
    private final PasswordEncoder passwordEncoder;
    private final AuthService authService;

    public String tokenFor(User user) {
        return jwtService.createInvitationToken(user, fingerprint(user));
    }

    public InvitationInfoDto info(String token) {
        return new InvitationInfoDto(validate(token).getUsername());
    }

    @Transactional
    public AuthResultDto accept(String token, String password, String confirmation) {
        User user = validate(token);
        validatePassword(password, confirmation);
        user.setPasswordDigest(passwordEncoder.encode(password));
        user.setInvitationAcceptedAt(LocalDateTime.now(ZoneOffset.UTC));
        users.save(user);
        return authService.authResult(user);
    }

    private User validate(String token) {
        Map<String, Object> claims = jwtService.verify(token).orElseThrow(ApiException::invalidToken);
        if (!"invitation".equals(claims.get("purpose")) || !(claims.get("sub") instanceof Number sub)) {
            throw ApiException.invalidToken();
        }
        User user = users.findById(sub.longValue()).orElseThrow(ApiException::invalidToken);
        if (!Objects.equals(claims.get("fp"), fingerprint(user))) {
            throw ApiException.invalidToken();
        }
        return user;
    }

    /** Last 10 chars of the password digest (empty before a password is set). */
    private String fingerprint(User user) {
        String digest = user.getPasswordDigest();
        if (digest == null || digest.isEmpty()) {
            return "";
        }
        return digest.length() <= 10 ? digest : digest.substring(digest.length() - 10);
    }

    private void validatePassword(String password, String confirmation) {
        Map<String, List<String>> fields = new LinkedHashMap<>();
        if (password == null || password.isEmpty()) {
            Validations.add(fields, "password", "nie może być puste");
        } else if (password.length() < 6) {
            Validations.add(fields, "password", "jest za krótkie (minimum 6 znaków)");
        }
        if (!Objects.equals(password, confirmation)) {
            Validations.add(fields, "password_confirmation", "nie pasuje do potwierdzenia");
        }
        Validations.throwIfAny(fields);
    }
}
