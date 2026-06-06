package pl.typerek.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

/**
 * A user's bet on a match. The foreign keys are {@code integer} in the schema
 * (not {@code bigint}), so they are modelled as scalar {@link Integer} values and
 * associations are loaded through the repositories — mirroring the explicit
 * queries the Rails code already used.
 */
@Entity
@Table(name = "answers")
@Getter
@Setter
public class Answer extends TimestampedEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "match_id")
    private Integer matchId;

    @Column(name = "user_id")
    private Integer userId;

    @Convert(converter = BetTypeConverter.class)
    @Column(name = "result")
    private BetType result;
}
