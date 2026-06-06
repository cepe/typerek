package pl.typerek.service;

import com.fasterxml.jackson.databind.JsonNode;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pl.typerek.domain.Answer;
import pl.typerek.domain.BetType;
import pl.typerek.domain.Match;
import pl.typerek.domain.User;
import pl.typerek.repo.AnswerRepository;
import pl.typerek.repo.MatchRepository;
import pl.typerek.repo.UserRepository;
import pl.typerek.web.dto.MatchDetailDto;
import pl.typerek.web.dto.MatchDto;
import pl.typerek.web.dto.MatchListDto;
import pl.typerek.web.dto.ParticipantDto;
import pl.typerek.web.dto.UserRefDto;
import pl.typerek.web.error.ApiException;

@Service
@RequiredArgsConstructor
public class MatchService {

    private final MatchRepository matches;
    private final AnswerRepository answers;
    private final UserRepository users;
    private final MatchMapper mapper;

    public MatchListDto list(User current) {
        Map<Integer, BetType> myAnswers = answers.findByUserId(current.getId().intValue()).stream()
                .collect(Collectors.toMap(Answer::getMatchId, Answer::getResult, (a, b) -> a));

        List<MatchDto> notFinished = matches.findByResultAIsNullOrResultBIsNullOrderByStartAsc().stream()
                .map(match -> mapper.toDto(match, myAnswers.get(match.getId().intValue())))
                .toList();
        List<MatchDto> finished = matches.findByResultAIsNotNullAndResultBIsNotNullOrderByStartDesc().stream()
                .map(match -> mapper.toDto(match, myAnswers.get(match.getId().intValue())))
                .toList();
        return new MatchListDto(notFinished, finished);
    }

    public MatchDetailDto detail(Long id, User current) {
        Match match = matches.findById(id).orElseThrow(ApiException::notFound);
        return toDetail(match, current);
    }

    @Transactional
    public MatchDetailDto update(Long id, Map<String, JsonNode> body, User current) {
        Match match = matches.findById(id).orElseThrow(ApiException::notFound);
        applyUpdates(match, body);
        validate(match);
        matches.save(match);
        return toDetail(match, current);
    }

    private MatchDetailDto toDetail(Match match, User current) {
        BetType myAnswer = answers
                .findByMatchIdAndUserId(match.getId().intValue(), current.getId().intValue())
                .map(Answer::getResult)
                .orElse(null);
        MatchDto dto = mapper.toDto(match, myAnswer);
        List<ParticipantDto> participants = match.isStarted() ? participants(match) : null;
        return new MatchDetailDto(dto, participants);
    }

    private List<ParticipantDto> participants(Match match) {
        Map<Integer, BetType> byUser = answers.findByMatchId(match.getId().intValue()).stream()
                .collect(Collectors.toMap(Answer::getUserId, Answer::getResult, (a, b) -> a));
        return users.findByInvitationAcceptedAtIsNotNullOrderByUsernameAsc().stream()
                .map(user -> new ParticipantDto(
                        new UserRefDto(user.getId(), user.getUsername()),
                        byUser.get(user.getId().intValue())))
                .toList();
    }

    // ── Admin update: apply only the keys present in the request body ──────────
    private void applyUpdates(Match match, Map<String, JsonNode> body) {
        Map<String, java.util.function.Consumer<JsonNode>> setters = new LinkedHashMap<>();
        setters.put("team_a", node -> match.setTeamA(asText(node)));
        setters.put("team_b", node -> match.setTeamB(asText(node)));
        setters.put("start", node -> match.setStart(asInstant(node)));
        setters.put("win_a", node -> match.setWinA(asDouble(node)));
        setters.put("tie", node -> match.setTie(asDouble(node)));
        setters.put("win_b", node -> match.setWinB(asDouble(node)));
        setters.put("win_tie_a", node -> match.setWinTieA(asDouble(node)));
        setters.put("win_tie_b", node -> match.setWinTieB(asDouble(node)));
        setters.put("not_tie", node -> match.setNotTie(asDouble(node)));
        setters.put("result_a", node -> match.setResultA(asInteger(node)));
        setters.put("result_b", node -> match.setResultB(asInteger(node)));

        setters.forEach((key, setter) -> {
            if (body.containsKey(key)) {
                setter.accept(body.get(key));
            }
        });
    }

    private void validate(Match match) {
        Map<String, List<String>> fields = new LinkedHashMap<>();
        validatePresence(fields, "team_a", match.getTeamA());
        validatePresence(fields, "team_b", match.getTeamB());
        validateOdds(fields, "win_a", match.getWinA());
        validateOdds(fields, "tie", match.getTie());
        validateOdds(fields, "win_b", match.getWinB());
        validateOdds(fields, "win_tie_a", match.getWinTieA());
        validateOdds(fields, "win_tie_b", match.getWinTieB());
        validateOdds(fields, "not_tie", match.getNotTie());
        validateResult(fields, "result_a", match.getResultA());
        validateResult(fields, "result_b", match.getResultB());
        Validations.throwIfAny(fields);
    }

    private void validatePresence(Map<String, List<String>> fields, String key, String value) {
        if (value == null || value.isBlank()) {
            Validations.add(fields, key, "nie może być puste");
        } else if (value.length() > 255) {
            Validations.add(fields, key, "jest za długie (maksymalnie 255 znaków)");
        }
    }

    private void validateOdds(Map<String, List<String>> fields, String key, Double value) {
        if (value != null && value < 0) {
            Validations.add(fields, key, "musi być większe lub równe 0");
        }
    }

    private void validateResult(Map<String, List<String>> fields, String key, Integer value) {
        if (value != null && value < 0) {
            Validations.add(fields, key, "musi być większe lub równe 0");
        }
    }

    private static String asText(JsonNode node) {
        return node == null || node.isNull() ? null : node.asText();
    }

    private static Double asDouble(JsonNode node) {
        return node == null || node.isNull() ? null : node.doubleValue();
    }

    private static Integer asInteger(JsonNode node) {
        return node == null || node.isNull() ? null : node.intValue();
    }

    private static java.time.LocalDateTime asInstant(JsonNode node) {
        if (node == null || node.isNull()) {
            return null;
        }
        return Instant.parse(node.asText()).atZone(java.time.ZoneOffset.UTC).toLocalDateTime();
    }
}
