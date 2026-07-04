package cn.edu.lingnan.util;

import java.io.IOException;
import java.io.InputStream;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.Properties;

/**
 * 数据库连接工具类，统一读取 db.properties 并创建 JDBC 连接。
 */
public class DBUtil {
    private static final Properties PROPERTIES = new Properties();

    static {
        try (InputStream inputStream = DBUtil.class.getClassLoader().getResourceAsStream("db.properties")) {
            if (inputStream == null) {
                throw new ExceptionInInitializerError("db.properties 配置文件不存在");
            }
            PROPERTIES.load(inputStream);
            Class.forName(PROPERTIES.getProperty("driver"));
        } catch (IOException | ClassNotFoundException e) {
            throw new ExceptionInInitializerError(e);
        }
    }

    private DBUtil() {
    }

    public static Connection getConnection() throws SQLException {
        return DriverManager.getConnection(
                PROPERTIES.getProperty("url"),
                PROPERTIES.getProperty("username"),
                PROPERTIES.getProperty("password")
        );
    }

    public static void close(ResultSet resultSet, Statement statement, Connection connection) {
        close(resultSet);
        close(statement);
        close(connection);
    }

    public static void close(AutoCloseable closeable) {
        if (closeable != null) {
            try {
                closeable.close();
            } catch (Exception e) {
                e.printStackTrace();
            }
        }
    }
}
