package pl.typerek.web;

import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import pl.typerek.service.InvitationService;
import pl.typerek.web.dto.AuthResultDto;
import pl.typerek.web.dto.InvitationAcceptRequest;
import pl.typerek.web.dto.InvitationInfoDto;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class InvitationsController {

    private final InvitationService invitationService;

    @GetMapping("/invitations/{token}")
    public InvitationInfoDto show(@PathVariable String token) {
        return invitationService.info(token);
    }

    @PostMapping("/invitations/{token}/accept")
    public AuthResultDto accept(@PathVariable String token,
                                @RequestBody(required = false) InvitationAcceptRequest request) {
        String password = request == null ? null : request.password();
        String confirmation = request == null ? null : request.passwordConfirmation();
        return invitationService.accept(token, password, confirmation);
    }
}
