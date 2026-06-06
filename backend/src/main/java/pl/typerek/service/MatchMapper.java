package pl.typerek.service;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import org.springframework.stereotype.Component;
import pl.typerek.domain.BetType;
import pl.typerek.domain.Match;
import pl.typerek.web.dto.MatchDto;
import pl.typerek.web.dto.OddsDto;

/** Builds the {@code Match} JSON shape from a {@link Match} entity. */
@Component
public class MatchMapper {

    public MatchDto toDto(Match match, BetType myAnswer) {
        return new MatchDto(
                match.getId(),
                match.getTeamA(),
                match.getTeamB(),
                formatStart(match.getStart()),
                match.isStarted(),
                match.isFinished(),
                match.getResultA(),
                match.getResultB(),
                odds(match),
                myAnswer);
    }

    public OddsDto odds(Match match) {
        return new OddsDto(match.getWinA(), match.getTie(), match.getWinB(),
                match.getWinTieA(), match.getWinTieB(), match.getNotTie());
    }

    /** ISO-8601 in UTC, seconds precision — mirrors Rails {@code start.utc.iso8601}. */
    static String formatStart(LocalDateTime start) {
        if (start == null) {
            return null;
        }
        return DateTimeFormatter.ISO_INSTANT.format(
                start.toInstant(ZoneOffset.UTC).truncatedTo(ChronoUnit.SECONDS));
    }
}
