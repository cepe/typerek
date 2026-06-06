package pl.typerek.service;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
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
import pl.typerek.web.dto.InvitationCreatedDto;
import pl.typerek.web.dto.UserDto;
import pl.typerek.web.dto.UserProfileDto;
import pl.typerek.web.dto.UserProfileMatchDto;
import pl.typerek.web.dto.UserProfileUserDto;
import pl.typerek.web.error.ApiException;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository users;
    private final AnswerRepository answers;
    private final MatchRepository matches;
    private final ScoringService scoring;
    private final MatchMapper matchMapper;
    private final InvitationService invitations;

    public List<UserDto> list() {
        List<User> all = users.findAllByOrderByUsernameAsc();
        Map<Long, String> nameById = all.stream()
                .collect(Collectors.toMap(User::getId, User::getUsername));
        return all.stream().map(user -> toDto(user, nameById)).toList();
    }

    @Transactional
    public InvitationCreatedDto createInvitation(String username, User current, String baseUrl) {
        validateNewUsername(username);
        User user = new User();
        user.setUsername(username);
        user.setInvitedById(current.getId().intValue());
        user.setInvitedByType("User");
        users.save(user);
        return invitation(user, baseUrl);
    }

    public InvitationCreatedDto resend(Long id, String baseUrl) {
        User user = users.findById(id).orElseThrow(ApiException::notFound);
        return invitation(user, baseUrl);
    }

    @Transactional
    public UserDto toggleFin(Long id) {
        User user = users.findById(id).orElseThrow(ApiException::notFound);
        user.setFin(!user.isFin());
        users.save(user);
        return toDto(user);
    }

    @Transactional
    public void delete(Long id) {
        User user = users.findById(id).orElseThrow(ApiException::notFound);
        answers.deleteByUserId(user.getId().intValue());
        users.delete(user);
    }

    public UserProfileDto profile(Long id) {
        User user = users.findById(id).orElseThrow(ApiException::notFound);
        List<Answer> userAnswers = answers.findByUserId(user.getId().intValue());
        Map<Long, Match> matchById = matches.findAll().stream()
                .collect(Collectors.toMap(Match::getId, Function.identity()));
        int accuracy = scoring.accuracy(userAnswers, matchById);

        Map<Integer, BetType> answerByMatch = userAnswers.stream()
                .collect(Collectors.toMap(Answer::getMatchId, Answer::getResult, (a, b) -> a));
        List<UserProfileMatchDto> startedMatches =
                matches.findByStartBeforeOrderByStartDesc(LocalDateTime.now(ZoneOffset.UTC)).stream()
                        .map(match -> new UserProfileMatchDto(
                                matchMapper.toDto(match, null),
                                answerByMatch.get(match.getId().intValue())))
                        .toList();

        return new UserProfileDto(
                new UserProfileUserDto(user.getId(), user.getUsername(), accuracy),
                startedMatches);
    }

    // ── helpers ────────────────────────────────────────────────────────────────
    private InvitationCreatedDto invitation(User user, String baseUrl) {
        String token = invitations.tokenFor(user);
        String url = baseUrl + "/invitations/" + token;
        return new InvitationCreatedDto(toDto(user), token, url);
    }

    private UserDto toDto(User user) {
        String invitedBy = user.getInvitedById() == null ? null
                : users.findById(user.getInvitedById().longValue()).map(User::getUsername).orElse(null);
        return new UserDto(user.getId(), user.getUsername(), user.isAdmin(),
                user.isActive(), user.isFin(), invitedBy);
    }

    private UserDto toDto(User user, Map<Long, String> nameById) {
        String invitedBy = user.getInvitedById() == null ? null
                : nameById.get(user.getInvitedById().longValue());
        return new UserDto(user.getId(), user.getUsername(), user.isAdmin(),
                user.isActive(), user.isFin(), invitedBy);
    }

    private void validateNewUsername(String username) {
        Map<String, List<String>> fields = new LinkedHashMap<>();
        if (username == null || username.isBlank()) {
            Validations.add(fields, "username", "nie może być puste");
        } else {
            if (username.length() > 255) {
                Validations.add(fields, "username", "jest za długie (maksymalnie 255 znaków)");
            }
            if (users.existsByUsername(username)) {
                Validations.add(fields, "username", "jest już zajęte");
            }
        }
        Validations.throwIfAny(fields);
    }
}
