package pl.typerek.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.Base64;
import java.util.Map;
import java.util.Optional;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import pl.typerek.domain.User;

/**
 * Minimal JWT (HS256) signer/verifier. Hand-rolled with {@link Mac} so it is
 * byte-compatible with Rails' {@code JWT.encode(payload, secret, 'HS256')} for any
 * secret length — letting tokens stay valid across the Rails→Java cutover when the
 * same {@code SECRET_KEY_BASE} is used.
 */
@Service
public class JwtService {

    private static final String HEADER_JSON = "{\"alg\":\"HS256\"}";
    private static final long ACCESS_TTL_SECONDS = 24L * 60 * 60;
    private static final long INVITATION_TTL_SECONDS = 72L * 60 * 60;

    private final byte[] secret;
    private final ObjectMapper mapper = new ObjectMapper();
    private final Base64.Encoder b64 = Base64.getUrlEncoder().withoutPadding();
    private final Base64.Decoder b64d = Base64.getUrlDecoder();

    public JwtService(@Value("${app.jwt.secret}") String secret) {
        this.secret = secret.getBytes(StandardCharsets.UTF_8);
    }

    public String createAccessToken(User user) {
        return createAccessToken(user, Instant.now());
    }

    /** Token issued at the given instant — mirrors Rails {@code AccessToken.encode(user, now:)}. */
    public String createAccessToken(User user, Instant issuedAt) {
        long exp = issuedAt.getEpochSecond() + ACCESS_TTL_SECONDS;
        return encode(Map.of("sub", user.getId(), "admin", user.isAdmin(), "exp", exp));
    }

    public String createInvitationToken(User user, String fingerprint) {
        long exp = Instant.now().getEpochSecond() + INVITATION_TTL_SECONDS;
        return encode(Map.of("sub", user.getId(), "purpose", "invitation", "fp", fingerprint, "exp", exp));
    }

    /** Access-token verification: signature + expiry, rejecting invitation tokens. */
    public Optional<Map<String, Object>> verifyAccessToken(String token) {
        return verify(token).filter(claims -> !"invitation".equals(claims.get("purpose")));
    }

    /** Verifies signature and expiry, returning the claims for a valid token. */
    public Optional<Map<String, Object>> verify(String token) {
        if (token == null || token.isBlank()) {
            return Optional.empty();
        }
        String[] parts = token.split("\\.");
        if (parts.length != 3) {
            return Optional.empty();
        }
        byte[] expectedSig = hmac((parts[0] + "." + parts[1]).getBytes(StandardCharsets.UTF_8));
        byte[] actualSig;
        Map<String, Object> claims;
        try {
            actualSig = b64d.decode(parts[2]);
            if (!MessageDigest.isEqual(expectedSig, actualSig)) {
                return Optional.empty();
            }
            claims = mapper.readValue(b64d.decode(parts[1]), new com.fasterxml.jackson.core.type.TypeReference<>() {
            });
        } catch (Exception e) {
            return Optional.empty();
        }
        Object exp = claims.get("exp");
        if (!(exp instanceof Number) || ((Number) exp).longValue() <= Instant.now().getEpochSecond()) {
            return Optional.empty();
        }
        return Optional.of(claims);
    }

    private String encode(Map<String, Object> claims) {
        try {
            String header = b64.encodeToString(HEADER_JSON.getBytes(StandardCharsets.UTF_8));
            String payload = b64.encodeToString(mapper.writeValueAsBytes(claims));
            String signingInput = header + "." + payload;
            String signature = b64.encodeToString(hmac(signingInput.getBytes(StandardCharsets.UTF_8)));
            return signingInput + "." + signature;
        } catch (Exception e) {
            throw new IllegalStateException("JWT encode failed", e);
        }
    }

    private byte[] hmac(byte[] data) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret, "HmacSHA256"));
            return mac.doFinal(data);
        } catch (Exception e) {
            throw new IllegalStateException("HMAC computation failed", e);
        }
    }
}
