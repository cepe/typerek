package pl.typerek.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "users")
@Getter
@Setter
public class User extends TimestampedEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String username;

    @Column(name = "password_digest")
    private String passwordDigest;

    /** Nullable in the schema (default false), so wrapped to tolerate legacy NULLs. */
    @Column
    private Boolean admin = false;

    @Column
    private Boolean fin = false;

    @Column(name = "invitation_accepted_at")
    private LocalDateTime invitationAcceptedAt;

    // Polymorphic association in Rails (always a User in practice). We keep the raw
    // columns and resolve the inviter's username via UserRepository.
    @Column(name = "invited_by_id")
    private Integer invitedById;

    @Column(name = "invited_by_type")
    private String invitedByType;

    public boolean isAdmin() {
        return Boolean.TRUE.equals(admin);
    }

    public boolean isFin() {
        return Boolean.TRUE.equals(fin);
    }

    /** True once the invitation has been accepted (mirrors {@code User.active} scope). */
    public boolean isActive() {
        return invitationAcceptedAt != null;
    }
}
