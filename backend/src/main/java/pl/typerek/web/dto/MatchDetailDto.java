package pl.typerek.web.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.util.List;
import lombok.Getter;

/**
 * {@code MatchDetail} = the match fields plus {@code participants}, which is present
 * only once the match has started (omitted otherwise).
 */
@Getter
public class MatchDetailDto extends MatchDto {

    @JsonInclude(JsonInclude.Include.NON_NULL)
    private final List<ParticipantDto> participants;

    public MatchDetailDto(MatchDto match, List<ParticipantDto> participants) {
        super(match);
        this.participants = participants;
    }
}
