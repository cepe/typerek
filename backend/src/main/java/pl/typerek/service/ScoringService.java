package pl.typerek.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;
import pl.typerek.domain.Answer;
import pl.typerek.domain.Match;

/**
 * Scoring rules ported from {@code Answer#point} / {@code User#points,accuracy}.
 * A bet scores the matching odds (rounded to 2 dp) when it is in the match's
 * {@code winningList}, otherwise zero. Rounding is HALF_UP to match Ruby's
 * {@code Float#round}.
 */
@Service
public class ScoringService {

    public double pointFor(Answer answer, Match match) {
        if (answer.getResult() == null || !match.winningList().contains(answer.getResult())) {
            return 0.0;
        }
        Double odd = match.oddFor(answer.getResult());
        return odd == null ? 0.0 : round2(odd);
    }

    public double totalPoints(List<Answer> answers, Map<Long, Match> matchById) {
        double sum = 0.0;
        for (Answer answer : answers) {
            Match match = matchById.get(answer.getMatchId().longValue());
            if (match != null) {
                sum += pointFor(answer, match);
            }
        }
        return round2(sum);
    }

    public int accuracy(List<Answer> answers, Map<Long, Match> matchById) {
        int correct = 0;
        for (Answer answer : answers) {
            Match match = matchById.get(answer.getMatchId().longValue());
            if (match != null && pointFor(answer, match) > 0.0) {
                correct++;
            }
        }
        return correct;
    }

    static double round2(double value) {
        return BigDecimal.valueOf(value).setScale(2, RoundingMode.HALF_UP).doubleValue();
    }
}
