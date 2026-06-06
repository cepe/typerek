package pl.typerek.web;

import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import pl.typerek.domain.User;
import pl.typerek.service.AuthService;
import pl.typerek.web.dto.CurrentUserDto;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class ProfileController {

    private final AuthService authService;

    @GetMapping("/me")
    public CurrentUserDto me(@AuthenticationPrincipal User user) {
        return authService.currentUser(user);
    }
}
