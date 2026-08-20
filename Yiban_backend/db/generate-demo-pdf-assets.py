"""Generate local PDF demo assets referenced by seed-demo-usage.sql.

These files are intentionally marked as demonstration-only documents.  They
live in the backend upload directory so /api/file/serve/<filename> can serve
the URLs that the seeded submissions and award proofs reference.
"""

from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.cidfonts import UnicodeCIDFont
from reportlab.pdfgen.canvas import Canvas


PAGE_W, PAGE_H = A4
FONT = "STSong-Light"
pdfmetrics.registerFont(UnicodeCIDFont(FONT))

ROOT = Path(__file__).resolve().parents[1]
OUTPUT_DIR = ROOT / "uploads"

PROJECTS = [
    {
        "file": "demo-math-zhang.pdf",
        "title": "数据远航队 - 建模思路说明",
        "competition": "2026年高教社杯全国大学生数学建模竞赛",
        "team": "数据远航队",
        "author": "陈昱辰、刘泽宇、周景然",
        "date": "2026-08-01",
        "summary": "围绕校园通勤高峰开展数据采集与优化建模，形成可复用的线路调度方案。",
        "highlights": ["完成问题拆解与指标定义", "建立初步数据清洗流程", "明确论文与代码分工"],
    },
    {
        "file": "demo-math-lu.pdf",
        "title": "模型探路者队 - 问题分析初稿",
        "competition": "2026年高教社杯全国大学生数学建模竞赛",
        "team": "模型探路者队",
        "author": "卢梓浩、王伟涛",
        "date": "2026-08-02",
        "summary": "从共享单车供需匹配切入，拟采用时空预测和多目标优化构建模型。",
        "highlights": ["整理公开数据来源", "完成变量与假设说明", "待补充敏感性分析"],
    },
    {
        "file": "demo-ai-zhang.pdf",
        "title": "星火创想队 - 校园学习助手原型",
        "competition": "2026年校级人工智能应用创新挑战赛",
        "team": "星火创想队",
        "author": "陈昱辰、王子睿",
        "date": "2026-08-02",
        "summary": "面向课程复习与竞赛资料整理，设计具备问答、计划和资料归纳能力的学习助手。",
        "highlights": ["完成主要使用流程原型", "定义知识库与问答边界", "待补充可用性测试记录"],
    },
    {
        "file": "demo-ai-lu.pdf",
        "title": "智能体实验室 - 项目原型说明",
        "competition": "2026年校级人工智能应用创新挑战赛",
        "team": "智能体实验室",
        "author": "卢梓浩、王伟涛",
        "date": "2026-08-01",
        "summary": "以校园办事指引为场景，构建能够识别问题、检索规则并给出下一步建议的智能体原型。",
        "highlights": ["完成核心对话链路", "覆盖三类校园服务场景", "准备现场演示脚本"],
    },
    {
        "file": "demo-design-zhou.pdf",
        "title": "拾光设计组 - 宿舍共享收纳方案",
        "competition": "2026年广东省大学生工业设计大赛",
        "team": "拾光设计组",
        "author": "苏晚晴、沈嘉禾",
        "date": "2026-08-02",
        "summary": "针对宿舍公共区域的杂物收纳和共享需求，提出模块化、低成本的产品服务方案。",
        "highlights": ["完成用户访谈框架", "形成产品草图与使用流程", "待补充尺寸和样机照片"],
    },
    {
        "file": "demo-market-qian.pdf",
        "title": "洞察实验室 - 大学生数字消费调研报告",
        "competition": "2026年大学生市场调查与分析大赛校赛",
        "team": "洞察实验室",
        "author": "林予安、江书宁",
        "date": "2026-08-01",
        "summary": "通过问卷和访谈分析大学生数字消费行为，提出校园服务优化与消费教育建议。",
        "highlights": ["完成样本结构说明", "输出核心用户洞察", "形成可执行的运营建议"],
    },
    {
        "file": "demo-innovation-qian.pdf",
        "title": "青年创客邦 - 校园二手循环平台项目书",
        "competition": "第十届“互联网+”大学生创新创业大赛",
        "team": "青年创客邦",
        "author": "林予安、江书宁",
        "date": "2026-06-22",
        "summary": "通过可信发布、闲置物品分类和校内自提点，降低校园二手交易的沟通与履约成本。",
        "highlights": ["明确价值主张与用户路径", "设计平台最小可行产品", "整理答辩展示提纲"],
    },
    {
        "file": "demo-art-zhou.pdf",
        "title": "城市记忆系列 - 视觉传达设计作品",
        "competition": "第四届全国大学生艺术设计大奖赛",
        "team": "个人作品",
        "author": "苏晚晴",
        "date": "2026-06-14",
        "summary": "以城市老街、公共空间和日常声音为线索，完成一组用于公共文化传播的视觉海报。",
        "highlights": ["完成系列主视觉系统", "形成多场景应用延展", "整理作品阐述与展示图"],
    },
]

CERTIFICATES = [
    {
        "file": "demo-award-iot.pdf",
        "recipient": "林予安、江书宁",
        "competition": "第十届“互联网+”大学生创新创业大赛",
        "award": "国家级二等奖",
        "date": "2026年6月25日",
        "number": "DEMO-2026-IOT-001",
    },
    {
        "file": "demo-award-art.pdf",
        "recipient": "苏晚晴",
        "competition": "第四届全国大学生艺术设计大奖赛",
        "award": "全国三等奖",
        "date": "2026年6月29日",
        "number": "DEMO-2026-ART-003",
    },
    {
        "file": "demo-award-zhang.pdf",
        "recipient": "陈昱辰",
        "competition": "第十届“互联网+”大学生创新创业大赛",
        "award": "校赛优秀奖",
        "date": "2026年6月18日",
        "number": "DEMO-2026-IOT-SCHOOL-008",
    },
    {
        "file": "demo-award-liu.pdf",
        "recipient": "孙亦凡",
        "competition": "第四届全国大学生艺术设计大奖赛",
        "award": "省级二等奖",
        "date": "2026年6月28日",
        "number": "DEMO-2026-ART-GD-011",
    },
    {
        "file": "demo-award-ai.pdf",
        "recipient": "卢梓浩、王伟涛",
        "competition": "2026年校级人工智能应用创新挑战赛",
        "award": "校赛创新实践奖",
        "date": "2026年7月30日",
        "number": "DEMO-2026-AI-006",
    },
]


def text_width(text: str, size: float) -> float:
    return pdfmetrics.stringWidth(text, FONT, size)


def draw_centered(canvas: Canvas, text: str, y: float, size: float, color=colors.black):
    canvas.setFont(FONT, size)
    canvas.setFillColor(color)
    canvas.drawString((PAGE_W - text_width(text, size)) / 2, y, text)


def draw_wrapped(canvas: Canvas, text: str, x: float, y: float, width: float, size: float, leading: float):
    canvas.setFont(FONT, size)
    words = list(text)
    line = ""
    current_y = y
    for char in words:
        candidate = line + char
        if text_width(candidate, size) > width and line:
            canvas.drawString(x, current_y, line)
            current_y -= leading
            line = char
        else:
            line = candidate
    if line:
        canvas.drawString(x, current_y, line)
        current_y -= leading
    return current_y


def chrome(canvas: Canvas, label: str):
    canvas.setFillColor(colors.HexColor("#0F2F58"))
    canvas.rect(0, PAGE_H - 24 * mm, PAGE_W, 24 * mm, fill=1, stroke=0)
    canvas.setFillColor(colors.HexColor("#13A0A8"))
    canvas.rect(0, PAGE_H - 26 * mm, PAGE_W, 2 * mm, fill=1, stroke=0)
    canvas.setFont(FONT, 11)
    canvas.setFillColor(colors.white)
    canvas.drawString(20 * mm, PAGE_H - 15 * mm, "易赛通 | 校园竞赛一体化平台")
    canvas.setFont(FONT, 8.5)
    canvas.setFillColor(colors.HexColor("#CDE9EE"))
    canvas.drawRightString(PAGE_W - 20 * mm, PAGE_H - 15 * mm, label)
    canvas.setStrokeColor(colors.HexColor("#D8E1EC"))
    canvas.line(20 * mm, 16 * mm, PAGE_W - 20 * mm, 16 * mm)
    canvas.setFont(FONT, 7.5)
    canvas.setFillColor(colors.HexColor("#6D7B8F"))
    canvas.drawString(20 * mm, 10 * mm, "本地演示文件 - 非真实证明、非官方材料")
    canvas.drawRightString(PAGE_W - 20 * mm, 10 * mm, "ETS-AI DEMO 2026")


def create_project(item: dict):
    path = OUTPUT_DIR / item["file"]
    canvas = Canvas(str(path), pagesize=A4, pageCompression=1)
    chrome(canvas, "项目材料样稿")

    canvas.setFillColor(colors.HexColor("#103A68"))
    canvas.setFont(FONT, 20)
    canvas.drawString(20 * mm, PAGE_H - 44 * mm, item["title"])
    canvas.setFont(FONT, 10)
    canvas.setFillColor(colors.HexColor("#5A6B80"))
    canvas.drawString(20 * mm, PAGE_H - 52 * mm, "项目材料 / 本地演示版")

    table_top = PAGE_H - 64 * mm
    rows = [("关联赛事", item["competition"]), ("团队 / 作品", item["team"]), ("提交成员", item["author"]), ("提交日期", item["date"])]
    for index, (key, value) in enumerate(rows):
        y = table_top - index * 10 * mm
        canvas.setFillColor(colors.HexColor("#EFF5FA"))
        canvas.roundRect(20 * mm, y - 7 * mm, 32 * mm, 7 * mm, 1.5 * mm, fill=1, stroke=0)
        canvas.setFillColor(colors.HexColor("#294B70"))
        canvas.setFont(FONT, 9)
        canvas.drawCentredString(36 * mm, y - 4.7 * mm, key)
        canvas.setFillColor(colors.HexColor("#243447"))
        canvas.setFont(FONT, 9.5)
        canvas.drawString(57 * mm, y - 4.7 * mm, value)

    y = table_top - 50 * mm
    canvas.setFillColor(colors.HexColor("#103A68"))
    canvas.setFont(FONT, 12)
    canvas.drawString(20 * mm, y, "项目概述")
    canvas.setFillColor(colors.HexColor("#34465A"))
    y = draw_wrapped(canvas, item["summary"], 20 * mm, y - 8 * mm, PAGE_W - 40 * mm, 10, 6.2 * mm)

    y -= 3 * mm
    canvas.setFillColor(colors.HexColor("#103A68"))
    canvas.setFont(FONT, 12)
    canvas.drawString(20 * mm, y, "当前进展")
    y -= 9 * mm
    for highlight in item["highlights"]:
        canvas.setFillColor(colors.HexColor("#13A0A8"))
        canvas.circle(23 * mm, y + 1.1 * mm, 1.3 * mm, fill=1, stroke=0)
        canvas.setFillColor(colors.HexColor("#34465A"))
        canvas.setFont(FONT, 10)
        canvas.drawString(28 * mm, y - 1 * mm, highlight)
        y -= 9 * mm

    canvas.setFillColor(colors.HexColor("#EFF5FA"))
    canvas.roundRect(20 * mm, 28 * mm, PAGE_W - 40 * mm, 18 * mm, 2 * mm, fill=1, stroke=0)
    canvas.setFillColor(colors.HexColor("#294B70"))
    canvas.setFont(FONT, 9)
    canvas.drawString(25 * mm, 39 * mm, "提交说明")
    canvas.setFillColor(colors.HexColor("#52657B"))
    canvas.setFont(FONT, 8.6)
    canvas.drawString(25 * mm, 33 * mm, "本文件仅用于本地演示数据与流程展示，不构成真实参赛材料。")
    canvas.save()


def create_certificate(item: dict):
    path = OUTPUT_DIR / item["file"]
    canvas = Canvas(str(path), pagesize=A4, pageCompression=1)
    canvas.setFillColor(colors.HexColor("#FBFAF5"))
    canvas.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
    canvas.setStrokeColor(colors.HexColor("#B68A36"))
    canvas.setLineWidth(2.2)
    canvas.rect(14 * mm, 14 * mm, PAGE_W - 28 * mm, PAGE_H - 28 * mm, fill=0, stroke=1)
    canvas.setStrokeColor(colors.HexColor("#D7BB7A"))
    canvas.setLineWidth(0.8)
    canvas.rect(18 * mm, 18 * mm, PAGE_W - 36 * mm, PAGE_H - 36 * mm, fill=0, stroke=1)
    canvas.setFillColor(colors.HexColor("#0F2F58"))
    draw_centered(canvas, "易赛通本地演示获奖证明", PAGE_H - 58 * mm, 24, colors.HexColor("#0F2F58"))
    draw_centered(canvas, "DEMONSTRATION CERTIFICATE", PAGE_H - 68 * mm, 9, colors.HexColor("#98742E"))

    canvas.setFillColor(colors.HexColor("#2B3E55"))
    draw_centered(canvas, "兹证明", PAGE_H - 92 * mm, 13, colors.HexColor("#2B3E55"))
    draw_centered(canvas, item["recipient"], PAGE_H - 113 * mm, 22, colors.HexColor("#0F2F58"))
    draw_centered(canvas, f"在“{item['competition']}”中表现突出", PAGE_H - 134 * mm, 12, colors.HexColor("#2B3E55"))
    draw_centered(canvas, f"获得 {item['award']}", PAGE_H - 154 * mm, 19, colors.HexColor("#A56F14"))

    canvas.setFillColor(colors.HexColor("#5D6C7D"))
    draw_centered(canvas, f"日期：{item['date']}", PAGE_H - 178 * mm, 10, colors.HexColor("#5D6C7D"))
    draw_centered(canvas, f"编号：{item['number']}", PAGE_H - 187 * mm, 9.5, colors.HexColor("#5D6C7D"))

    canvas.setFillColor(colors.HexColor("#D9E3EF"))
    canvas.circle(PAGE_W - 50 * mm, 53 * mm, 13 * mm, fill=1, stroke=0)
    canvas.setStrokeColor(colors.HexColor("#B68A36"))
    canvas.setLineWidth(1)
    canvas.circle(PAGE_W - 50 * mm, 53 * mm, 10 * mm, fill=0, stroke=1)
    draw_centered(canvas, "", 1, 1)
    canvas.setFillColor(colors.HexColor("#98742E"))
    canvas.setFont(FONT, 8)
    canvas.drawCentredString(PAGE_W - 50 * mm, 54 * mm, "演示专用")
    canvas.setFont(FONT, 7)
    canvas.drawCentredString(PAGE_W - 50 * mm, 48 * mm, "非官方印章")

    canvas.setFont(FONT, 8)
    canvas.setFillColor(colors.HexColor("#7B8796"))
    canvas.drawCentredString(PAGE_W / 2, 28 * mm, "本文件仅用于本地系统演示，不具备任何证明效力。")
    canvas.save()


def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    for project in PROJECTS:
        create_project(project)
    for certificate in CERTIFICATES:
        create_certificate(certificate)
    print(f"Generated {len(PROJECTS) + len(CERTIFICATES)} demo PDFs in {OUTPUT_DIR}")


if __name__ == "__main__":
    main()
