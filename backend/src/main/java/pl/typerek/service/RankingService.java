package pl.typerek.service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import pl.typerek.domain.Answer;
import pl.typerek.domain.Match;
import pl.typerek.domain.User;
import pl.typerek.repo.AnswerRepository;
import pl.typerek.repo.MatchRepository;
import pl.typerek.repo.UserRepository;

/**
 * The participant ranking ({@code Typerek::Ranking::Query}). Ordering: points
 * descending, ties broken by username ascending (case-insensitive). Positions are
 * shared for equal point totals (e.g. 1, 1, 3).
 */
@Service
@RequiredArgsConstructor
public class RankingService {

    private final UserRepository users;
    private final AnswerRepository answers;
    private final MatchRepository matches;
    private final ScoringService scoring;

    public List<RankingEntry> ranking() {
        List<User> active = users.findByInvitationAcceptedAtIsNotNullOrderByUsernameAsc();
        Map<Long, Match> matchById = matches.findAll().stream()
                .collect(Collectors.toMap(Match::getId, Function.identity()));
        Map<Integer, List<Answer>> answersByUser = answers.findAll().stream()
                .collect(Collectors.groupingBy(Answer::getUserId));

        record Scored(User user, double points, int accuracy) {
        }

        List<Scored> scored = active.stream()
                .map(user -> {
                    List<Answer> userAnswers = answersByUser.getOrDefault(user.getId().intValue(), List.of());
                    return new Scored(user,
                            scoring.totalPoints(userAnswers, matchById),
                            scoring.accuracy(userAnswers, matchById));
                })
                .sorted(Comparator.comparingDouble(Scored::points).reversed()
                        .thenComparing(s -> s.user().getUsername().toLowerCase(Locale.ROOT)))
                .toList();

        List<Double> points = scored.stream().map(Scored::points).toList();
        List<RankingEntry> ranking = new ArrayList<>(scored.size());
        for (Scored s : scored) {
            int position = points.indexOf(s.points()) + 1;
            ranking.add(new RankingEntry(s.user(), s.points(), s.accuracy(), position));
        }
        return ranking;
    }

    /** The ranking row for the given user (app header), or empty when not active. */
    public Optional<RankingEntry> entryFor(User user) {
        return ranking().stream()
                .filter(entry -> entry.user().getId().equals(user.getId()))
                .findFirst();
    }
}
