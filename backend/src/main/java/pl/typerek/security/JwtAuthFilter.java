package pl.typerek.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import pl.typerek.repo.UserRepository;

/**
 * Authenticates requests carrying a valid {@code Authorization: Bearer <jwt>}.
 * The role is always re-derived from the database (never trusted from the token),
 * mirroring the Rails {@code BaseController#authenticate!}.
 */
@Component
@RequiredArgsConstructor
public class JwtAuthFilter extends OncePerRequestFilter {

    private final JwtService jwtService;
    private final UserRepository users;

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request,
                                    @NonNull HttpServletResponse response,
                                    @NonNull FilterChain chain) throws ServletException, IOException {
        String token = bearerToken(request);
        if (token != null) {
            jwtService.verifyAccessToken(token)
                    .map(claims -> claims.get("sub"))
                    .filter(sub -> sub instanceof Number)
                    .flatMap(sub -> users.findById(((Number) sub).longValue()))
                    .ifPresent(user -> {
                        List<SimpleGrantedAuthority> authorities = user.isAdmin()
                                ? List.of(new SimpleGrantedAuthority("ROLE_USER"), new SimpleGrantedAuthority("ROLE_ADMIN"))
                                : List.of(new SimpleGrantedAuthority("ROLE_USER"));
                        var auth = new UsernamePasswordAuthenticationToken(user, null, authorities);
                        SecurityContextHolder.getContext().setAuthentication(auth);
                    });
        }
        chain.doFilter(request, response);
    }

    private String bearerToken(HttpServletRequest request) {
        String header = request.getHeader("Authorization");
        if (header == null) {
            return null;
        }
        String[] parts = header.split(" ");
        return parts.length == 0 ? null : parts[parts.length - 1];
    }
}
