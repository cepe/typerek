package pl.typerek.repo;

import java.time.LocalDateTime;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import pl.typerek.domain.Match;

public interface MatchRepository extends JpaRepository<Match, Long> {

    /** Not finished: at least one result missing. Ascending by kickoff. */
    List<Match> findByResultAIsNullOrResultBIsNullOrderByStartAsc();

    /** Finished: both results set. Descending by kickoff. */
    List<Match> findByResultAIsNotNullAndResultBIsNotNullOrderByStartDesc();

    /** Started matches (kickoff in the past). Descending by kickoff. */
    List<Match> findByStartBeforeOrderByStartDesc(LocalDateTime now);
}
