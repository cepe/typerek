package pl.typerek.web;

import com.fasterxml.jackson.databind.JsonNode;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RestController;
import pl.typerek.domain.User;
import pl.typerek.service.BetService;
import pl.typerek.service.MatchService;
import pl.typerek.web.dto.AnswerDto;
import pl.typerek.web.dto.BetRequest;
import pl.typerek.web.dto.MatchDetailDto;
import pl.typerek.web.dto.MatchListDto;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class MatchesController {

    private final MatchService matchService;
    private final BetService betService;

    @GetMapping("/matches")
    public MatchListDto index(@AuthenticationPrincipal User user) {
        return matchService.list(user);
    }

    @GetMapping("/matches/{id}")
    public MatchDetailDto show(@PathVariable Long id, @AuthenticationPrincipal User user) {
        return matchService.detail(id, user);
    }

    // Rails `resources :matches, only: [:update]` answers both PUT and PATCH.
    @RequestMapping(value = "/matches/{id}", method = {RequestMethod.PUT, RequestMethod.PATCH})
    @PreAuthorize("hasRole('ADMIN')")
    public MatchDetailDto update(@PathVariable Long id,
                                 @RequestBody(required = false) Map<String, JsonNode> body,
                                 @AuthenticationPrincipal User user) {
        return matchService.update(id, body == null ? Map.of() : body, user);
    }

    @PutMapping("/matches/{id}/bet")
    public AnswerDto bet(@PathVariable Long id,
                         @RequestBody(required = false) BetRequest request,
                         @AuthenticationPrincipal User user) {
        return betService.placeBet(id, user, request == null ? null : request.result());
    }
}
