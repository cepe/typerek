package pl.typerek.web.dto;

import java.util.List;

public record MatchListDto(List<MatchDto> notFinished, List<MatchDto> finished) {
}
