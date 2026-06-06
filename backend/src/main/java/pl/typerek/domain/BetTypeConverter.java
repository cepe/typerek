package pl.typerek.domain;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

/** Maps {@link BetType} to the integer codes stored in {@code answers.result}. */
@Converter
public class BetTypeConverter implements AttributeConverter<BetType, Integer> {

    @Override
    public Integer convertToDatabaseColumn(BetType attribute) {
        return attribute == null ? null : attribute.code();
    }

    @Override
    public BetType convertToEntityAttribute(Integer dbData) {
        return dbData == null ? null : BetType.fromCode(dbData);
    }
}
