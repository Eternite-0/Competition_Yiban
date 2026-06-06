package com.etsaion.vo.ai;

/**
 * 表示模型返回的一次工具调用请求。
 */
public class ToolCallVO {
    private String id;
    private String functionName;
    private String arguments;

    public ToolCallVO() {}

    public ToolCallVO(String id, String functionName, String arguments) {
        this.id = id;
        this.functionName = functionName;
        this.arguments = arguments;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getFunctionName() { return functionName; }
    public void setFunctionName(String functionName) { this.functionName = functionName; }

    public String getArguments() { return arguments; }
    public void setArguments(String arguments) { this.arguments = arguments; }
}
