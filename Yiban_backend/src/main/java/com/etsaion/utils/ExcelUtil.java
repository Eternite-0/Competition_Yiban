package com.etsaion.utils;

import com.etsaion.vo.StudentComprehensiveVO;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;

import java.util.List;

public class ExcelUtil {

    public static Workbook export(List<StudentComprehensiveVO> list, String sheetName, String[] headers) {
        Workbook workbook = new XSSFWorkbook();
        Sheet sheet = workbook.createSheet(sheetName);

        // Header style (vibrant slate background, bold white text)
        CellStyle headerStyle = workbook.createCellStyle();
        headerStyle.setFillForegroundColor(IndexedColors.DARK_TEAL.getIndex());
        headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        headerStyle.setAlignment(HorizontalAlignment.CENTER);
        headerStyle.setVerticalAlignment(VerticalAlignment.CENTER);
        
        Font headerFont = workbook.createFont();
        headerFont.setFontName("Microsoft YaHei");
        headerFont.setBold(true);
        headerFont.setColor(IndexedColors.WHITE.getIndex());
        headerFont.setFontHeightInPoints((short) 12);
        headerStyle.setFont(headerFont);

        // Content style (plain font, thin borders)
        CellStyle contentStyle = workbook.createCellStyle();
        contentStyle.setAlignment(HorizontalAlignment.CENTER);
        contentStyle.setVerticalAlignment(VerticalAlignment.CENTER);
        contentStyle.setBorderTop(BorderStyle.THIN);
        contentStyle.setBorderBottom(BorderStyle.THIN);
        contentStyle.setBorderLeft(BorderStyle.THIN);
        contentStyle.setBorderRight(BorderStyle.THIN);

        Font contentFont = workbook.createFont();
        contentFont.setFontName("Microsoft YaHei");
        contentFont.setFontHeightInPoints((short) 10);
        contentStyle.setFont(contentFont);

        // Create headers
        Row headerRow = sheet.createRow(0);
        headerRow.setHeightInPoints(30);
        for (int i = 0; i < headers.length; i++) {
            Cell cell = headerRow.createCell(i);
            cell.setCellValue(headers[i]);
            cell.setCellStyle(headerStyle);
        }

        // Fill data rows
        int rowIdx = 1;
        for (StudentComprehensiveVO vo : list) {
            Row row = sheet.createRow(rowIdx++);
            row.setHeightInPoints(24);

            Cell cell0 = row.createCell(0);
            cell0.setCellValue(vo.getRealName());
            cell0.setCellStyle(contentStyle);

            Cell cell1 = row.createCell(1);
            cell1.setCellValue(vo.getUsername());
            cell1.setCellStyle(contentStyle);

            Cell cell2 = row.createCell(2);
            cell2.setCellValue(vo.getCollege() + " - " + vo.getMajor() + " (" + vo.getClassName() + ")");
            cell2.setCellStyle(contentStyle);

            Cell cell3 = row.createCell(3);
            cell3.setCellValue(vo.getParticipationCount());
            cell3.setCellStyle(contentStyle);

            Cell cell4 = row.createCell(4);
            cell4.setCellValue(vo.getComprehensiveScore());
            cell4.setCellStyle(contentStyle);
        }

        // Auto-fit columns
        for (int i = 0; i < headers.length; i++) {
            sheet.autoSizeColumn(i);
            // Set minimum width for safety
            int currentWidth = sheet.getColumnWidth(i);
            if (currentWidth < 4000) {
                sheet.setColumnWidth(i, 5000);
            }
        }

        return workbook;
    }
}
