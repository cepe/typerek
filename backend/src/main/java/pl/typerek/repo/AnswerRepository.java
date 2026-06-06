package pl.typerek.repo;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import pl.typerek.domain.Answer;

public interface AnswerRepository extends JpaRepository<Answer, Long> {

    List<Answer> findByUserId(Integer userId);

    List<Answer> findByMatchId(Integer matchId);

    Optional<Answer> findByMatchIdAndUserId(Integer matchId, Integer userId);

    /** Removes a user's bets (Rails {@code has_many :answers, dependent: :destroy}). */
    long deleteByUserId(Integer userId);
}
