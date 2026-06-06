package pl.typerek.web;

import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import pl.typerek.service.RankingService;
import pl.typerek.web.dto.RankingEntryDto;
import pl.typerek.web.dto.UserRefDto;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class RankingsController {

    private final RankingService rankingService;

    @GetMapping("/ranking")
    public List<RankingEntryDto> show() {
        return rankingService.ranking().stream()
                .map(entry -> new RankingEntryDto(
                        entry.position(),
                        new UserRefDto(entry.user().getId(), entry.user().getUsername()),
                        entry.points(),
                        entry.accuracy()))
                .toList();
    }
}
