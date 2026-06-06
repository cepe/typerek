package pl.typerek;

import static java.nio.charset.StandardCharsets.UTF_8;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.Instant;
import java.util.Base64;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.junit.jupiter.api.Test;
import pl.typerek.domain.User;
import pl.typerek.security.JwtService;

/**
 * Pure unit tests (no Spring/Docker) for the JWT layer. The key guarantee is
 * cross-compatibility with Rails' {@code JWT.encode(payload, secret, 'HS256')}: a
 * token minted the Rails way (integer {@code sub}, {@code admin}/{@code exp} claims,
 * any header) must validate here under the same secret — that is what keeps users
 * logged in across the cutover.
 */
class JwtServiceTest {

    private static final String SECRET = "rails-style-secret-key-0123456789-abcdefghij";
    private final JwtService jwt = new JwtService(SECRET);

    @Test
    void acceptsRailsStyleAccessToken() throws Exception {
        long exp = Instant.now().getEpochSecond() + 3600;
        // Rails ruby-jwt adds a "typ" header; sub is an integer.
        String token = forge("{\"typ\":\"JWT\",\"alg\":\"HS256\"}",
                "{\"sub\":42,\"admin\":true,\"exp\":" + exp + "}", SECRET);

        var claims = jwt.verifyAccessToken(token);
        assertTrue(claims.isPresent());
        assertEquals(42, ((Number) claims.get().get("sub")).intValue());
    }

    @Test
    void rejectsExpiredToken() throws Exception {
        long exp = Instant.now().getEpochSecond() - 10;
        String token = forge("{\"alg\":\"HS256\"}", "{\"sub\":1,\"exp\":" + exp + "}", SECRET);
        assertTrue(jwt.verifyAccessToken(token).isEmpty());
    }

    @Test
    void rejectsTokenSignedWithDifferentSecret() throws Exception {
        long exp = Instant.now().getEpochSecond() + 3600;
        String token = forge("{\"alg\":\"HS256\"}", "{\"sub\":1,\"exp\":" + exp + "}",
                "a-completely-different-secret-key-aaaaaaaa");
        assertTrue(jwt.verify(token).isEmpty());
    }

    @Test
    void verifyAccessTokenRejectsInvitationToken() {
        User user = new User();
        user.setId(7L);
        String invitation = jwt.createInvitationToken(user, "");

        // An invitation token must not authenticate API requests…
        assertFalse(jwt.verifyAccessToken(invitation).isPresent());
        // …but is still a structurally valid, verifiable token.
        assertTrue(jwt.verify(invitation).isPresent());
    }

    private static String forge(String header, String payload, String secret) throws Exception {
        Base64.Encoder enc = Base64.getUrlEncoder().withoutPadding();
        String h = enc.encodeToString(header.getBytes(UTF_8));
        String p = enc.encodeToString(payload.getBytes(UTF_8));
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(secret.getBytes(UTF_8), "HmacSHA256"));
        String sig = enc.encodeToString(mac.doFinal((h + "." + p).getBytes(UTF_8)));
        return h + "." + p + "." + sig;
    }
}
