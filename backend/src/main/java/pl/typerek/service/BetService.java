package pl.typerek.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pl.typerek.domain.Answer;
import pl.typerek.domain.BetType;
import pl.typerek.domain.Match;
import pl.typerek.domain.User;
import pl.typerek.repo.AnswerRepository;
import pl.typerek.repo.MatchRepository;
import pl.typerek.web.dto.AnswerDto;
import pl.typerek.web.error.ApiException;

/** Places or updates the caller's bet ({@code Typerek::MakeBet::Handler}). */
@Service
@RequiredArgsConstructor
public class BetService {

    private final MatchRepository matches;
    private final AnswerRepository answers;

    @Transactional
    public AnswerDto placeBet(Long matchId, User user, String result) {
        Match match = matches.findById(matchId).orElseThrow(ApiException::notFound);
        // Order matches Rails: the kickoff check runs before the bet-type validation.
        if (match.isStarted()) {
            throw ApiException.unprocessable("Mecz już się rozpoczął.");
        }
        BetType type = BetType.fromWire(result);
        if (type == null) {
            throw ApiException.unprocessable("Nieprawidłowy typ.");
        }
        Answer answer = answers.findByMatchIdAndUserId(match.getId().intValue(), user.getId().intValue())
                .orElseGet(() -> {
                    Answer created = new Answer();
                    created.setMatchId(match.getId().intValue());
                    created.setUserId(user.getId().intValue());
                    return created;
                });
        answer.setResult(type);
        answers.save(answer);
        return new AnswerDto(match.getId(), type);
    }
}
