import mysql.connector
import re

# 连接数据库
conn = mysql.connector.connect(
    host='localhost',
    user='root',
    password='123456',
    database='etsaion'
)
cursor = conn.cursor()

# 读取 SQL 文件
with open('D:/易班/Competition_Yiban/Yiban_backend/db/import-roster-2024.sql', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. 插入专业数据（忽略重复）
major_sql = """
INSERT IGNORE INTO `major` (`name`, `college`, `status`) VALUES
('人工智能', '计算机与人工智能学院', 'active'),
('教育技术学', '计算机与人工智能学院', 'active'),
('数据科学与大数据技术', '计算机与人工智能学院', 'active'),
('计算机科学与技术', '计算机与人工智能学院', 'active'),
('软件工程', '计算机与人工智能学院', 'active'),
('软件工程(创新班)', '计算机与人工智能学院', 'active')
"""
cursor.execute(major_sql)
conn.commit()
print("专业数据导入完成")

# 2. 获取专业 ID
cursor.execute("SELECT id, name FROM major WHERE college='计算机与人工智能学院'")
major_map = {row[1]: row[0] for row in cursor.fetchall()}
print("专业ID映射:", major_map)

# 3. 插入班级数据
classes = [
    ('2024人工智能1班', '人工智能', '2024'),
    ('2024人工智能2班', '人工智能', '2024'),
    ('2024大数据1班', '数据科学与大数据技术', '2024'),
    ('2024大数据2班', '数据科学与大数据技术', '2024'),
    ('2024教育技术学1班', '教育技术学', '2024'),
    ('2024教育数字化创新班', '教育技术学', '2024'),
    ('2024计科1班', '计算机科学与技术', '2024'),
    ('2024计科2班', '计算机科学与技术', '2024'),
    ('2024计科3班', '计算机科学与技术', '2024'),
    ('2024计科4班', '计算机科学与技术', '2024'),
    ('2024软件工程1班', '软件工程', '2024'),
    ('2024软件工程2班', '软件工程', '2024'),
    ('2024软件工程3班', '软件工程', '2024'),
    ('2024软件工程4班', '软件工程', '2024'),
    ('2024软件工程5班', '软件工程', '2024'),
    ('2024软件工程6班', '软件工程', '2024'),
    ('2024软件工程创新1班', '软件工程(创新班)', '2024'),
    ('2024软件工程创新2班', '软件工程(创新班)', '2024'),
]

for cls_name, major_name, grade in classes:
    major_id = major_map.get(major_name)
    if major_id:
        try:
            cursor.execute(
                "INSERT IGNORE INTO class_info (name, college, major_id, grade, status) VALUES (%s, %s, %s, %s, %s)",
                (cls_name, '计算机与人工智能学院', major_id, grade, 'active')
            )
        except Exception as e:
            print(f"班级 {cls_name} 已存在或错误: {e}")

conn.commit()
print("班级数据导入完成")

# 4. 获取班级 ID
cursor.execute("SELECT id, name FROM class_info WHERE college='计算机与人工智能学院'")
class_map = {row[1]: row[0] for row in cursor.fetchall()}
print("班级ID映射完成，共", len(class_map), "个班级")

# 5. 解析并插入学生数据
# 从 SQL 文件中提取学生数据
student_pattern = r"\('(\d+)',\s*'([^']+)',\s*'计算机与人工智能学院',\s*\(SELECT id FROM major WHERE name='([^']+)'\),\s*\(SELECT id FROM class_info WHERE name='([^']+)' AND grade='(\d+)'\),\s*'(\d+)',\s*'pending'\)"

students = re.findall(student_pattern, content)
print(f"解析到 {len(students)} 名学生数据")

success = 0
failed = 0
errors = []

for student_no, real_name, major_name, class_name, grade, _ in students:
    major_id = major_map.get(major_name)
    class_id = class_map.get(class_name)

    if major_id and class_id:
        try:
            cursor.execute(
                "INSERT IGNORE INTO student_roster (student_no, real_name, college, major_id, class_id, grade, status) VALUES (%s, %s, %s, %s, %s, %s, 'pending')",
                (student_no, real_name, '计算机与人工智能学院', major_id, class_id, grade)
            )
            success += 1
        except Exception as e:
            failed += 1
            errors.append(f"{student_no}: {e}")
    else:
        failed += 1
        errors.append(f"{student_no}: 专业或班级未找到 ({major_name}, {class_name})")

conn.commit()

print(f"\n导入完成:")
print(f"  成功: {success}")
print(f"  失败: {failed}")
if errors:
    print(f"  错误详情:")
    for err in errors[:10]:
        print(f"    - {err}")

# 6. 验证结果
cursor.execute("SELECT COUNT(*) FROM student_roster WHERE college='计算机与人工智能学院'")
count = cursor.fetchone()[0]
print(f"\n计算机与人工智能学院花名册总数: {count}")

cursor.close()
conn.close()
