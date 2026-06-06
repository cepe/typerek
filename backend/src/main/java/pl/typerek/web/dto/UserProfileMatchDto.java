package pl.typerek.web.dto;

import lombok.Getter;
import pl.typerek.domain.BetType;

/** The match fields plus this profile user's bet ({@code answer}). */
@Getter
public class UserProfileMatchDto extends MatchDto {

    private final BetType answer;

    public UserProfileMatchDto(MatchDto match, BetType answer) {
        super(match);
        this.answer = answer;
    }
}
