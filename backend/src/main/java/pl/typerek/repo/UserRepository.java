package pl.typerek.repo;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import pl.typerek.domain.User;

public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByUsername(String username);

    boolean existsByUsername(String username);

    /** Admin user list — ordered by username. */
    List<User> findAllByOrderByUsernameAsc();

    /** Active participants (invitation accepted), ordered by username. */
    List<User> findByInvitationAcceptedAtIsNotNullOrderByUsernameAsc();
}
