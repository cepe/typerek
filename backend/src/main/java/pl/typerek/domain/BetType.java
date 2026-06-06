package pl.typerek.domain;

import com.fasterxml.jackson.annotation.JsonValue;

/**
 * The six bet types. The integer {@code code} mirrors the Rails {@code Answer}
 * enum stored in {@code answers.result} (win_a=0 … not_tie=5); the {@code wire}
 * string is what the JSON API exposes.
 */
public enum BetType {
    WIN_A("win_a", 0),
    TIE("tie", 1),
    WIN_B("win_b", 2),
    WIN_TIE_A("win_tie_a", 3),
    WIN_TIE_B("win_tie_b", 4),
    NOT_TIE("not_tie", 5);

    private final String wire;
    private final int code;

    BetType(String wire, int code) {
        this.wire = wire;
        this.code = code;
    }

    @JsonValue
    public String wire() {
        return wire;
    }

    public int code() {
        return code;
    }

    /** Parses the wire string, or returns {@code null} for an unknown value. */
    public static BetType fromWire(String value) {
        if (value == null) {
            return null;
        }
        for (BetType type : values()) {
            if (type.wire.equals(value)) {
                return type;
            }
        }
        return null;
    }

    public static BetType fromCode(int code) {
        for (BetType type : values()) {
            if (type.code == code) {
                return type;
            }
        }
        throw new IllegalArgumentException("Unknown bet code: " + code);
    }
}
