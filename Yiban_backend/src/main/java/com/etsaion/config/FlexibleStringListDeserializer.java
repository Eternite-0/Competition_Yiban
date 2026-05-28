package com.etsaion.config;

import cn.hutool.core.util.StrUtil;
import cn.hutool.json.JSONUtil;
import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.core.JsonToken;
import com.fasterxml.jackson.databind.DeserializationContext;
import com.fasterxml.jackson.databind.JsonDeserializer;

import java.io.IOException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

public class FlexibleStringListDeserializer extends JsonDeserializer<List<String>> {
    @Override
    public List<String> deserialize(JsonParser parser, DeserializationContext context) throws IOException {
        JsonToken token = parser.currentToken();
        if (token == JsonToken.START_ARRAY) {
            List<String> values = new ArrayList<>();
            while (parser.nextToken() != JsonToken.END_ARRAY) {
                String value = parser.getValueAsString();
                if (StrUtil.isNotBlank(value)) {
                    values.add(value.trim());
                }
            }
            return values;
        }

        String raw = parser.getValueAsString();
        if (StrUtil.isBlank(raw)) {
            return new ArrayList<>();
        }

        String trimmed = raw.trim();
        if (JSONUtil.isTypeJSONArray(trimmed)) {
            return JSONUtil.toList(trimmed, String.class);
        }
        return Arrays.stream(trimmed.split("[,，]"))
                .map(String::trim)
                .filter(StrUtil::isNotBlank)
                .collect(Collectors.toList());
    }
}
