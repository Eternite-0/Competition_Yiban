package com.etsaion.service.ai;

import cn.hutool.core.util.IdUtil;
import com.etsaion.exception.BusinessException;
import com.etsaion.vo.ai.AiArtifactVO;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.Font;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.apache.poi.xwpf.usermodel.ParagraphAlignment;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.apache.poi.xwpf.usermodel.XWPFParagraph;
import org.apache.poi.xwpf.usermodel.XWPFRun;
import org.apache.poi.xwpf.usermodel.XWPFTable;
import org.apache.poi.xwpf.usermodel.XWPFTableCell;
import org.apache.poi.xwpf.usermodel.XWPFTableRow;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
public class AiArtifactService {

    private static final int MAX_COLUMNS = 24;
    private static final int MAX_ROWS = 500;
    private static final int MAX_PARAGRAPHS = 80;

    @Value("${file.upload-path}")
    private String uploadPath;

    public AiArtifactVO createExcelArtifact(
            String title,
            String description,
            List<String> columns,
            List<List<String>> rows,
            String sheetName
    ) {
        List<String> safeColumns = sanitizeColumns(columns);
        List<List<String>> safeRows = sanitizeRows(rows, safeColumns.size());
        String safeTitle = sanitizeTitle(title, "AI导出表");
        String artifactId = IdUtil.simpleUUID();
        String filename = artifactId + ".xlsx";
        File target = resolveTarget(filename);

        try (Workbook workbook = new XSSFWorkbook(); FileOutputStream out = new FileOutputStream(target)) {
            Sheet sheet = workbook.createSheet(sanitizeSheetName(sheetName, safeTitle));
            CellStyle headerStyle = workbook.createCellStyle();
            Font headerFont = workbook.createFont();
            headerFont.setBold(true);
            headerStyle.setFont(headerFont);

            Row header = sheet.createRow(0);
            for (int i = 0; i < safeColumns.size(); i++) {
                Cell cell = header.createCell(i);
                cell.setCellValue(safeColumns.get(i));
                cell.setCellStyle(headerStyle);
            }

            for (int rowIndex = 0; rowIndex < safeRows.size(); rowIndex++) {
                Row row = sheet.createRow(rowIndex + 1);
                List<String> values = safeRows.get(rowIndex);
                for (int colIndex = 0; colIndex < safeColumns.size(); colIndex++) {
                    row.createCell(colIndex).setCellValue(colIndex < values.size() ? values.get(colIndex) : "");
                }
            }

            for (int i = 0; i < safeColumns.size(); i++) {
                sheet.autoSizeColumn(i);
                sheet.setColumnWidth(i, Math.min(sheet.getColumnWidth(i) + 768, 12000));
            }
            workbook.write(out);
        } catch (IOException e) {
            throw new BusinessException("Excel 文件生成失败");
        }

        return artifact(filename, safeTitle + ".xlsx", "xlsx", description);
    }

    public AiArtifactVO createDocxArtifact(
            String title,
            String description,
            List<String> paragraphs,
            List<String> tableColumns,
            List<List<String>> tableRows
    ) {
        String safeTitle = sanitizeTitle(title, "AI生成文档");
        List<String> safeParagraphs = sanitizeParagraphs(paragraphs);
        List<String> safeColumns = tableColumns == null || tableColumns.isEmpty()
                ? List.of()
                : sanitizeColumns(tableColumns);
        List<List<String>> safeRows = safeColumns.isEmpty()
                ? List.of()
                : sanitizeRows(tableRows, safeColumns.size());
        String artifactId = IdUtil.simpleUUID();
        String filename = artifactId + ".docx";
        File target = resolveTarget(filename);

        try (XWPFDocument document = new XWPFDocument(); FileOutputStream out = new FileOutputStream(target)) {
            XWPFParagraph titleParagraph = document.createParagraph();
            titleParagraph.setAlignment(ParagraphAlignment.CENTER);
            XWPFRun titleRun = titleParagraph.createRun();
            titleRun.setBold(true);
            titleRun.setFontSize(16);
            titleRun.setText(safeTitle);

            for (String paragraph : safeParagraphs) {
                XWPFParagraph bodyParagraph = document.createParagraph();
                bodyParagraph.setSpacingAfter(160);
                XWPFRun run = bodyParagraph.createRun();
                run.setFontSize(11);
                run.setText(paragraph);
            }

            if (!safeColumns.isEmpty()) {
                XWPFTable table = document.createTable(safeRows.size() + 1, safeColumns.size());
                XWPFTableRow header = table.getRow(0);
                for (int i = 0; i < safeColumns.size(); i++) {
                    writeCell(header.getCell(i), safeColumns.get(i), true);
                }
                for (int rowIndex = 0; rowIndex < safeRows.size(); rowIndex++) {
                    XWPFTableRow row = table.getRow(rowIndex + 1);
                    List<String> values = safeRows.get(rowIndex);
                    for (int colIndex = 0; colIndex < safeColumns.size(); colIndex++) {
                        writeCell(row.getCell(colIndex), colIndex < values.size() ? values.get(colIndex) : "", false);
                    }
                }
            }

            document.write(out);
        } catch (IOException e) {
            throw new BusinessException("DOCX 文件生成失败");
        }

        return artifact(filename, safeTitle + ".docx", "docx", description);
    }

    private File resolveTarget(String filename) {
        File dir = new File(uploadPath).getAbsoluteFile();
        if (!dir.exists() && !dir.mkdirs()) {
            throw new BusinessException("文件目录创建失败");
        }
        return new File(dir, filename);
    }

    private AiArtifactVO artifact(String filename, String name, String type, String description) {
        AiArtifactVO artifact = new AiArtifactVO();
        artifact.setId(filename.substring(0, filename.lastIndexOf('.')));
        artifact.setName(name);
        artifact.setType(type);
        artifact.setUrl("/api/file/serve/" + filename);
        artifact.setDescription(sanitizeText(description, 160));
        artifact.setCreateTime(LocalDateTime.now());
        return artifact;
    }

    private List<String> sanitizeColumns(List<String> columns) {
        if (columns == null || columns.isEmpty()) {
            throw new BusinessException("生成表格文件至少需要一列");
        }
        return columns.stream()
                .filter(Objects::nonNull)
                .map(value -> sanitizeText(value, 40))
                .filter(value -> !value.isBlank())
                .limit(MAX_COLUMNS)
                .collect(Collectors.toList());
    }

    private List<List<String>> sanitizeRows(List<List<String>> rows, int columnCount) {
        if (rows == null) return List.of();
        return rows.stream()
                .filter(Objects::nonNull)
                .limit(MAX_ROWS)
                .map(row -> row.stream()
                        .map(value -> sanitizeText(value, 240))
                        .limit(columnCount)
                        .collect(Collectors.toList()))
                .collect(Collectors.toList());
    }

    private List<String> sanitizeParagraphs(List<String> paragraphs) {
        if (paragraphs == null || paragraphs.isEmpty()) {
            return List.of("该文档由易赛通 AI 助手根据当前对话生成。");
        }
        return paragraphs.stream()
                .filter(Objects::nonNull)
                .map(value -> sanitizeText(value, 1200))
                .filter(value -> !value.isBlank())
                .limit(MAX_PARAGRAPHS)
                .collect(Collectors.toList());
    }

    private String sanitizeTitle(String value, String fallback) {
        String title = sanitizeText(value, 60);
        return title.isBlank() ? fallback : title;
    }

    private String sanitizeSheetName(String sheetName, String fallback) {
        String name = sanitizeText(sheetName, 31)
                .replaceAll("[\\\\/?*\\[\\]:]", " ")
                .trim();
        return name.isBlank() ? sanitizeText(fallback, 31) : name;
    }

    private String sanitizeText(String value, int maxLength) {
        if (value == null) return "";
        String sanitized = value
                .replace('\u0000', ' ')
                .replaceAll("[\\r\\n\\t]+", " ")
                .trim();
        return sanitized.length() <= maxLength ? sanitized : sanitized.substring(0, maxLength);
    }

    private void writeCell(XWPFTableCell cell, String text, boolean bold) {
        cell.removeParagraph(0);
        XWPFParagraph paragraph = cell.addParagraph();
        XWPFRun run = paragraph.createRun();
        run.setBold(bold);
        run.setText(text);
    }
}
