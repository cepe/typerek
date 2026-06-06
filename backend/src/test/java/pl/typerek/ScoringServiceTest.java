package pl.typerek;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import pl.typerek.domain.Answer;
import pl.typerek.domain.BetType;
import pl.typerek.domain.Match;
import pl.typerek.service.ScoringService;

/** Pure unit tests for the scoring rules (no Spring/Docker). */
class ScoringServiceTest {

    private final ScoringService scoring = new ScoringService();

    private Match finishedMatch(int resultA, int resultB) {
        Match match = new Match();
        match.setId(1L);
        match.setResultA(resultA);
        match.setResultB(resultB);
        match.setWinA(5.0);
        match.setTie(3.0);
        match.setWinB(4.0);
        match.setWinTieA(1.5);
        match.setWinTieB(1.6);
        match.setNotTie(1.25);
        return match;
    }

    private Answer answer(BetType result) {
        Answer answer = new Answer();
        answer.setMatchId(1);
        answer.setResult(result);
        return answer;
    }

    @Test
    void winningListReflectsTheResult() {
        assertEquals(List.of(BetType.WIN_A, BetType.WIN_TIE_A, BetType.NOT_TIE),
                finishedMatch(2, 1).winningList());
        assertEquals(List.of(BetType.WIN_B, BetType.WIN_TIE_B, BetType.NOT_TIE),
                finishedMatch(0, 1).winningList());
        assertEquals(List.of(BetType.TIE, BetType.WIN_TIE_A, BetType.WIN_TIE_B),
                finishedMatch(1, 1).winningList());
        assertEquals(List.of(), new Match().winningList());
    }

    @Test
    void scoresWinningBetWithTheMatchingOdds() {
        Match match = finishedMatch(2, 1); // team A wins
        assertEquals(5.0, scoring.pointFor(answer(BetType.WIN_A), match));
        assertEquals(1.5, scoring.pointFor(answer(BetType.WIN_TIE_A), match));
        assertEquals(1.25, scoring.pointFor(answer(BetType.NOT_TIE), match));
        assertEquals(0.0, scoring.pointFor(answer(BetType.WIN_B), match));
        assertEquals(0.0, scoring.pointFor(answer(BetType.TIE), match));
    }

    @Test
    void totalPointsAndAccuracyAggregateAcrossMatches() {
        Match match = finishedMatch(2, 1);
        Map<Long, Match> matchById = Map.of(1L, match);
        List<Answer> answers = List.of(answer(BetType.WIN_A), answer(BetType.WIN_B));

        assertEquals(5.0, scoring.totalPoints(answers, matchById));
        assertEquals(1, scoring.accuracy(answers, matchById));
    }
}
