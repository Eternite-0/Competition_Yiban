package cn.edu.lingnan.tag;

import javax.servlet.jsp.JspException;
import javax.servlet.jsp.tagext.SimpleTagSupport;
import java.io.IOException;

/**
 * 自定义 JSP 标签，根据状态文字输出不同颜色的徽标。
 */
public class StatusTag extends SimpleTagSupport {
    private String value;

    public void setValue(String value) {
        this.value = value;
    }

    @Override
    public void doTag() throws JspException, IOException {
        String text = value == null ? "未知" : value;
        String type = "neutral";
        if (text.contains("通过") || text.contains("正常") || text.contains("报名中")) {
            type = "success";
        } else if (text.contains("退回") || text.contains("修改") || text.contains("待")) {
            type = "warning";
        } else if (text.contains("拒") || text.contains("禁用") || text.contains("结束")) {
            type = "danger";
        }
        getJspContext().getOut().write("<span class=\"status status-" + type + "\">" + escape(text) + "</span>");
    }

    private String escape(String text) {
        return text.replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;");
    }
}
