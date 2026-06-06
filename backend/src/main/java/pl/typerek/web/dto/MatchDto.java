package pl.typerek.web.dto;

import lombok.Getter;
import pl.typerek.domain.BetType;

/**
 * The {@code Match} schema. {@code start} is pre-formatted ISO-8601 UTC. Modelled as
 * a class (not a record) so {@link MatchDetailDto} and {@link UserProfileMatchDto}
 * can extend it and serialize the match fields inline.
 */
@Getter
public class MatchDto {

    private final Long id;
    private final String teamA;
    private final String teamB;
    private final String start;
    private final boolean started;
    private final boolean finished;
    private final Integer resultA;
    private final Integer resultB;
    private final OddsDto odds;
    private final BetType myAnswer;

    public MatchDto(Long id, String teamA, String teamB, String start, boolean started, boolean finished,
                    Integer resultA, Integer resultB, OddsDto odds, BetType myAnswer) {
        this.id = id;
        this.teamA = teamA;
        this.teamB = teamB;
        this.start = start;
        this.started = started;
        this.finished = finished;
        this.resultA = resultA;
        this.resultB = resultB;
        this.odds = odds;
        this.myAnswer = myAnswer;
    }

    protected MatchDto(MatchDto other) {
        this(other.id, other.teamA, other.teamB, other.start, other.started, other.finished,
                other.resultA, other.resultB, other.odds, other.myAnswer);
    }
}
