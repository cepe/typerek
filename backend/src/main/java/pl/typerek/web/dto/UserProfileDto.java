package pl.typerek.web.dto;

import java.util.List;

public record UserProfileDto(UserProfileUserDto user, List<UserProfileMatchDto> startedMatches) {
}
