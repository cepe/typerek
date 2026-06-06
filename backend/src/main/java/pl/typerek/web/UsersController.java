package pl.typerek.web;

import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;
import pl.typerek.domain.User;
import pl.typerek.service.UserService;
import pl.typerek.web.dto.CreateUserRequest;
import pl.typerek.web.dto.InvitationCreatedDto;
import pl.typerek.web.dto.UserDto;
import pl.typerek.web.dto.UserProfileDto;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class UsersController {

    private final UserService userService;

    @GetMapping("/users")
    @PreAuthorize("hasRole('ADMIN')")
    public List<UserDto> index() {
        return userService.list();
    }

    @PostMapping("/users")
    @PreAuthorize("hasRole('ADMIN')")
    @ResponseStatus(HttpStatus.CREATED)
    public InvitationCreatedDto create(@RequestBody(required = false) CreateUserRequest request,
                                       @AuthenticationPrincipal User current) {
        String username = request == null ? null : request.username();
        return userService.createInvitation(username, current, baseUrl());
    }

    @GetMapping("/users/{id}")
    public UserProfileDto show(@PathVariable Long id) {
        return userService.profile(id);
    }

    @DeleteMapping("/users/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void destroy(@PathVariable Long id) {
        userService.delete(id);
    }

    @PostMapping("/users/{id}/resend-invitation")
    @PreAuthorize("hasRole('ADMIN')")
    public InvitationCreatedDto resend(@PathVariable Long id) {
        return userService.resend(id, baseUrl());
    }

    @PatchMapping("/users/{id}/fin")
    @PreAuthorize("hasRole('ADMIN')")
    public UserDto fin(@PathVariable Long id) {
        return userService.toggleFin(id);
    }

    /** Public base URL (honours X-Forwarded-* behind nginx) for invite links. */
    private String baseUrl() {
        return ServletUriComponentsBuilder.fromCurrentContextPath().build().toUriString();
    }
}
