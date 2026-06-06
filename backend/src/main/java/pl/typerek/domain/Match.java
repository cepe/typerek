package pl.typerek.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "matches")
@Getter
@Setter
public class Match extends TimestampedEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "team_a")
    private String teamA;

    @Column(name = "team_b")
    private String teamB;

    @Column(name = "start")
    private LocalDateTime start;

    @Column(name = "win_a")
    private Double winA;

    @Column(name = "win_b")
    private Double winB;

    @Column(name = "tie")
    private Double tie;

    @Column(name = "win_tie_a")
    private Double winTieA;

    @Column(name = "win_tie_b")
    private Double winTieB;

    @Column(name = "not_tie")
    private Double notTie;

    @Column(name = "result_a")
    private Integer resultA;

    @Column(name = "result_b")
    private Integer resultB;

    public boolean isStarted() {
        return start != null && start.isBefore(LocalDateTime.now(ZoneOffset.UTC));
    }

    public boolean isFinished() {
        return resultA != null && resultB != null;
    }

    /** The bet types that score points given this match's result (empty if no result). */
    public List<BetType> winningList() {
        if (resultA == null || resultB == null) {
            return List.of();
        }
        if (resultA > resultB) {
            return List.of(BetType.WIN_A, BetType.WIN_TIE_A, BetType.NOT_TIE);
        }
        if (resultA < resultB) {
            return List.of(BetType.WIN_B, BetType.WIN_TIE_B, BetType.NOT_TIE);
        }
        return List.of(BetType.TIE, BetType.WIN_TIE_A, BetType.WIN_TIE_B);
    }

    /** The odds column matching the given bet type. */
    public Double oddFor(BetType type) {
        return switch (type) {
            case WIN_A -> winA;
            case TIE -> tie;
            case WIN_B -> winB;
            case WIN_TIE_A -> winTieA;
            case WIN_TIE_B -> winTieB;
            case NOT_TIE -> notTie;
        };
    }
}
