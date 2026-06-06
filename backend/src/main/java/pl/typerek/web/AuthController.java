package pl.typerek.web;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import pl.typerek.service.AuthService;
import pl.typerek.web.dto.AuthResultDto;
import pl.typerek.web.dto.LoginRequest;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/auth/login")
    public AuthResultDto login(@RequestBody(required = false) LoginRequest request) {
        String username = request == null ? null : request.username();
        String password = request == null ? null : request.password();
        return authService.login(username, password);
    }

    /** Stateless JWT: the client discards the token; the endpoint exists for symmetry. */
    @PostMapping("/auth/logout")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void logout() {
    }
}
