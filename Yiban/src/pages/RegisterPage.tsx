import { toast } from 'sonner';
import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { motion } from 'framer-motion';
import apiClient from '../api/client';
import BrandLogo from '../components/BrandLogo';

type RegisterRole = 'student' | 'teacher';

interface StudentLookupData {
  realName: string;
  college: string;
  majorName: string;
  className: string;
  grade: string;
}

export default function RegisterPage() {
  const [activeRole, setActiveRole] = useState<RegisterRole>('student');
  const navigate = useNavigate();
  const setAuth = useStore((s) => s.setAuth);
  const [loading, setLoading] = useState(false);

  // 学生注册状态
  const [studentNo, setStudentNo] = useState('');
  const [studentName, setStudentName] = useState('');
  const [studentLookup, setStudentLookup] = useState<StudentLookupData | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState('');
  const [studentPassword, setStudentPassword] = useState('');
  const [studentConfirmPwd, setStudentConfirmPwd] = useState('');
  const [agreement, setAgreement] = useState(false);

  // 教师注册状态
  const [teacherUsername, setTeacherUsername] = useState('');
  const [teacherName, setTeacherName] = useState('');
  const [teacherCollege, setTeacherCollege] = useState('');
  const [teacherPassword, setTeacherPassword] = useState('');
  const [teacherConfirmPwd, setTeacherConfirmPwd] = useState('');

  // 学院列表
  const [colleges, setColleges] = useState<string[]>([]);

  useEffect(() => {
    const fetchColleges = async () => {
      try {
        const res: any = await apiClient.get('/admin/colleges');
        setColleges(res || []);
      } catch (err) {
        console.error('获取学院列表失败:', err);
        // 使用默认列表作为后备
        setColleges(['计算机学院', '电子学院', '商学院', '设计学院', '机械学院', '外语学院', '理学院', '文学院']);
      }
    };
    fetchColleges();
  }, []);

  // 查询学号
  const handleLookupStudent = async () => {
    if (!studentNo.trim()) {
      toast.error('请输入学号');
      return;
    }
    setLookupLoading(true);
    setLookupError('');
    setStudentLookup(null);

    try {
      const res: any = await apiClient.post('/auth/lookup-student', { studentNo: studentNo.trim() });

      if (res.found) {
        setStudentLookup(res.data);
        setStudentName(''); // 清空姓名，让用户输入
      } else if (res.registered) {
        setLookupError('该学号已注册，请直接登录');
      } else {
        setLookupError(res.message || '未找到该学号，请确认学号是否正确');
      }
    } catch (err: any) {
      setLookupError(err.message || '查询失败，请稍后重试');
    } finally {
      setLookupLoading(false);
    }
  };

  // 学生注册
  const handleStudentRegister = async () => {
    if (!studentLookup) {
      toast.error('请先查询学号');
      return;
    }
    if (!studentName.trim()) {
      toast.error('请输入真实姓名');
      return;
    }
    if (!studentPassword || studentPassword.length < 8) {
      toast.error('密码长度不能少于8位');
      return;
    }
    if (!/(?=.*[a-zA-Z])(?=.*\d)/.test(studentPassword)) {
      toast.error('密码必须包含字母和数字');
      return;
    }
    if (studentPassword !== studentConfirmPwd) {
      toast.error('两次密码不一致');
      return;
    }
    if (!agreement) {
      toast.error('请同意注册协议');
      return;
    }

    setLoading(true);
    try {
      const res: any = await apiClient.post('/auth/register', {
        role: 'student',
        username: studentNo.trim(),
        realName: studentName.trim(),
        password: studentPassword,
        agreement: true,
      });

      // 自动登录
      if (res.token) {
        const normalizedUser = {
          ...res.user,
          id: String(res.user.id),
          name: res.user.realName || res.user.username || '用户',
        };
        setAuth(normalizedUser, res.token);
        toast.success('注册成功！');
        navigate('/student');
      }
    } catch (err: any) {
      toast.error(err.message || '注册失败');
    } finally {
      setLoading(false);
    }
  };

  // 教师注册
  const handleTeacherRegister = async () => {
    if (!teacherUsername.trim()) {
      toast.error('请输入工号');
      return;
    }
    if (!teacherName.trim()) {
      toast.error('请输入真实姓名');
      return;
    }
    if (!teacherCollege) {
      toast.error('请选择所属学院');
      return;
    }
    if (!teacherPassword || teacherPassword.length < 8) {
      toast.error('密码长度不能少于8位');
      return;
    }
    if (!/(?=.*[a-zA-Z])(?=.*\d)/.test(teacherPassword)) {
      toast.error('密码必须包含字母和数字');
      return;
    }
    if (teacherPassword !== teacherConfirmPwd) {
      toast.error('两次密码不一致');
      return;
    }

    setLoading(true);
    try {
      const { default: apiClient } = await import('../api/client');
      await apiClient.post('/auth/register', {
        role: 'teacher',
        username: teacherUsername.trim(),
        realName: teacherName.trim(),
        college: teacherCollege,
        password: teacherPassword,
        agreement: true,
      });

      toast.success('注册成功，请等待管理员审核');
      navigate('/login');
    } catch (err: any) {
      toast.error(err.message || '注册失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      <div className="hidden" />

      {/* 顶栏 */}
      <header className="flex h-14 items-center justify-between border-b border-hairline bg-canvas px-5">
        <Link to="/login" className="flex items-center">
          <BrandLogo size={32} withWordmark subtitle="创建账号" />
        </Link>
        <Link to="/login" className="text-[13px] text-body-muted hover:text-ink">返回登录</Link>
      </header>

      <div className="flex flex-1 items-center justify-center px-4 py-10">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28 }}
          className="w-full max-w-[420px]"
        >
          <div className="mb-6 text-center">
            <h1 className="text-[26px] font-semibold tracking-tight text-ink">创建账号</h1>
            <p className="mt-2 text-[13.5px] text-body-subtle">选择身份并完成注册信息</p>
          </div>
          <div className="auth-card !max-w-none">
            {/* 角色切换 */}
            <div className="mb-4 grid grid-cols-2 gap-1 rounded-[10px] bg-surface-tile-1 p-1">
              {(['student', 'teacher'] as const).map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => setActiveRole(role)}
                  className={`h-9 rounded-lg text-[13px] font-medium transition-colors ${
                    activeRole === role
                      ? 'bg-canvas text-ink shadow-[0_0_0_1px_var(--color-border)]'
                      : 'text-body-subtle hover:text-ink'
                  }`}
                >
                  {role === 'student' ? '学生' : '教师'}
                </button>
              ))}
            </div>

            {/* 学生注册表单 */}
            {activeRole === 'student' && (
              <form
                className="flex flex-col gap-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  handleStudentRegister();
                }}
              >
                {/* 学号查询 */}
                <div className="flex gap-2">
                  <input
                    className="input-glass h-11 px-4 text-[15px] flex-1"
                    placeholder="请输入学号"
                    value={studentNo}
                    aria-label="学号"
                    onChange={(e) => {
                      setStudentNo(e.target.value);
                      setStudentLookup(null);
                      setLookupError('');
                      setStudentName('');
                      setStudentPassword('');
                      setStudentConfirmPwd('');
                      setAgreement(false);
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleLookupStudent}
                    disabled={lookupLoading}
                    className="h-11 px-4 btn-primary h-11 shrink-0"
                  >
                    {lookupLoading ? '查询中...' : '查询'}
                  </button>
                </div>

                {/* 查询错误 */}
                {lookupError && (
                  <div className="rounded-lg border border-danger-border bg-danger-bg px-3 py-2 text-[13px] text-error">
                    {lookupError}
                  </div>
                )}

                {/* 预填信息 */}
                {studentLookup && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="rounded-lg border border-border bg-surface-tile-1 p-4"
                  >
                    <div className="mb-2 text-[12px] font-medium text-body-muted">学籍信息</div>
                    <div className="grid grid-cols-2 gap-2 text-[13px]">
                      <div><span className="text-ink-muted-48">学院：</span>{studentLookup.college}</div>
                      <div><span className="text-ink-muted-48">专业：</span>{studentLookup.majorName}</div>
                      <div><span className="text-ink-muted-48">班级：</span>{studentLookup.className}</div>
                      <div><span className="text-ink-muted-48">年级：</span>{studentLookup.grade}</div>
                    </div>
                  </motion.div>
                )}

                {/* 姓名输入 */}
                {studentLookup && (
                  <input
                    className="input-glass h-11 px-4 text-[15px]"
                    placeholder="请输入真实姓名（需与学籍一致）"
                    value={studentName}
                    aria-label="真实姓名"
                    onChange={(e) => setStudentName(e.target.value)}
                  />
                )}

                {/* 密码 */}
                {studentLookup && (
                  <>
                    <input
                      className="input-glass h-11 px-4 text-[15px]"
                      placeholder="设置密码（至少8位，包含字母和数字）"
                      type="password"
                      value={studentPassword}
                      aria-label="密码"
                      onChange={(e) => setStudentPassword(e.target.value)}
                    />
                    <input
                      className="input-glass h-11 px-4 text-[15px]"
                      placeholder="确认密码"
                      type="password"
                      value={studentConfirmPwd}
                      aria-label="确认密码"
                      onChange={(e) => setStudentConfirmPwd(e.target.value)}
                    />

                    {/* 协议 */}
                    <label className="flex items-start gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        className="w-[14px] h-[14px] rounded-xs accent-ink cursor-pointer mt-0.5"
                        checked={agreement}
                        onChange={(e) => setAgreement(e.target.checked)}
                      />
                      <span className="text-[12px] text-ink-muted-80 leading-relaxed">
                        我已阅读并同意
                        <Link to="/terms" target="_blank" className="text-ink underline decoration-border-emphasis underline-offset-2 mx-1">《注册协议》</Link>
                        和
                        <span className="text-ink underline decoration-border-emphasis underline-offset-2 mx-1 cursor-pointer">《隐私政策》</span>
                      </span>
                    </label>

                    {/* 注册按钮 */}
                    <button
                      type="submit"
                      disabled={loading}
                      className="btn-primary mt-2 h-11 w-full"
                    >
                      {loading && (
                        <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                      )}
                      {loading ? '注册中...' : '注册'}
                    </button>
                  </>
                )}
              </form>
            )}

            {/* 教师注册表单 */}
            {activeRole === 'teacher' && (
              <form
                className="flex flex-col gap-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  handleTeacherRegister();
                }}
              >
                <input
                  className="input-glass h-11 px-4 text-[15px]"
                  placeholder="请输入工号"
                  value={teacherUsername}
                  aria-label="工号"
                  onChange={(e) => setTeacherUsername(e.target.value)}
                />
                <input
                  className="input-glass h-11 px-4 text-[15px]"
                  placeholder="请输入真实姓名"
                  value={teacherName}
                  aria-label="真实姓名"
                  onChange={(e) => setTeacherName(e.target.value)}
                />
                <select
                  className="input-glass h-11 px-4 text-[15px] appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23666%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[length:16px] bg-[right_12px_center] bg-no-repeat pr-10"
                  value={teacherCollege}
                  aria-label="所属学院"
                  onChange={(e) => setTeacherCollege(e.target.value)}
                >
                  <option value="">请选择所属学院</option>
                  {colleges.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <input
                  className="input-glass h-11 px-4 text-[15px]"
                  placeholder="设置密码（至少8位，包含字母和数字）"
                  type="password"
                  value={teacherPassword}
                  aria-label="密码"
                  onChange={(e) => setTeacherPassword(e.target.value)}
                />
                <input
                  className="input-glass h-11 px-4 text-[15px]"
                  placeholder="确认密码"
                  type="password"
                  value={teacherConfirmPwd}
                  aria-label="确认密码"
                  onChange={(e) => setTeacherConfirmPwd(e.target.value)}
                />

                <div className="rounded-lg border border-border bg-surface-tile-1 px-3 py-2 text-[12px] text-body-muted">
                  教师账号注册后需要管理员审核，审核通过后方可登录。
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary mt-2 h-11 w-full"
                >
                  {loading && (
                    <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                  )}
                  {loading ? '注册中...' : '提交注册'}
                </button>
              </form>
            )}
          </div>

          {/* 底部链接 */}
          <div className="mt-md text-center text-[13px] text-ink-muted-80">
            已有账号？
            <Link to="/login" className="text-primary hover:text-ink font-medium ml-1 transition">
              返回登录
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
