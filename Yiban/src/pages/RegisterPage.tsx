import { toast } from 'sonner';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { motion } from 'framer-motion';

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

  const colleges = [
    '计算机学院', '电子学院', '商学院', '设计学院',
    '机械学院', '外语学院', '理学院', '文学院'
  ];

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
      const { default: apiClient } = await import('../api/client');
      const res: any = await apiClient.post('/auth/lookup-student', { studentNo: studentNo.trim() });

      if (res.found) {
        setStudentLookup(res.data);
        setStudentName(''); // 清空姓名，让用户输入
      } else {
        setLookupError(res.message || '查询失败');
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
    if (!studentPassword || studentPassword.length < 6) {
      toast.error('密码长度不能少于6位');
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
      const { default: apiClient } = await import('../api/client');
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
    if (!teacherPassword || teacherPassword.length < 6) {
      toast.error('密码长度不能少于6位');
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
    <div className="relative min-h-screen overflow-hidden text-ink antialiased">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-canvas-parchment" />

      {/* 顶栏 */}
      <div className="h-[44px] flex items-center px-xl text-[12px] tracking-tight text-ink bg-canvas border-b border-hairline">
        <a href="/login" className="flex items-center gap-2 font-medium hover:text-primary transition">
          <span className="material-symbols-outlined text-[16px] text-primary icon-fill">workspace_premium</span>
          易赛通 · 学生竞赛管理平台
        </a>
      </div>

      <div className="min-h-[calc(100vh-44px)] flex items-center justify-center px-xl py-xxl">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-[480px]"
        >
          <div className="glass-strong px-xl py-xl">
            <div className="mb-lg">
              <h2 className="font-display font-semibold text-[28px] leading-tight tracking-tight text-ink">
                注册账号
              </h2>
              <p className="text-[13px] text-ink-muted-48 mt-1.5">
                请选择角色并填写注册信息
              </p>
            </div>

            {/* 角色切换 */}
            <div className="flex w-full p-1 mb-lg bg-canvas-parchment rounded-pill border border-hairline">
              {(['student', 'teacher'] as const).map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => setActiveRole(role)}
                  className={`flex-1 py-2 text-[13px] text-center transition-all rounded-pill ${
                    activeRole === role
                      ? 'bg-canvas text-ink font-semibold shadow-sm'
                      : 'text-ink-muted-48 hover:text-ink'
                  }`}
                >
                  {role === 'student' ? '学生注册' : '教师注册'}
                </button>
              ))}
            </div>

            {/* 学生注册表单 */}
            {activeRole === 'student' && (
              <div className="flex flex-col gap-3">
                {/* 学号查询 */}
                <div className="flex gap-2">
                  <input
                    className="input-glass h-[48px] px-4 text-[15px] flex-1"
                    placeholder="请输入学号"
                    value={studentNo}
                    onChange={(e) => {
                      setStudentNo(e.target.value);
                      setStudentLookup(null);
                      setLookupError('');
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleLookupStudent}
                    disabled={lookupLoading}
                    className="h-[48px] px-4 rounded-pill bg-primary text-on-primary text-[13px] font-medium hover:bg-primary-focus transition disabled:opacity-50"
                  >
                    {lookupLoading ? '查询中...' : '查询'}
                  </button>
                </div>

                {/* 查询错误 */}
                {lookupError && (
                  <div className="text-[13px] text-red-500 bg-red-50 px-3 py-2 rounded-lg">
                    {lookupError}
                  </div>
                )}

                {/* 预填信息 */}
                {studentLookup && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="bg-primary/5 border border-primary/20 rounded-lg p-4"
                  >
                    <div className="text-[12px] text-primary font-medium mb-2">学籍信息</div>
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
                    className="input-glass h-[48px] px-4 text-[15px]"
                    placeholder="请输入真实姓名（需与学籍一致）"
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                  />
                )}

                {/* 密码 */}
                {studentLookup && (
                  <>
                    <input
                      className="input-glass h-[48px] px-4 text-[15px]"
                      placeholder="设置密码（至少6位）"
                      type="password"
                      value={studentPassword}
                      onChange={(e) => setStudentPassword(e.target.value)}
                    />
                    <input
                      className="input-glass h-[48px] px-4 text-[15px]"
                      placeholder="确认密码"
                      type="password"
                      value={studentConfirmPwd}
                      onChange={(e) => setStudentConfirmPwd(e.target.value)}
                    />

                    {/* 协议 */}
                    <label className="flex items-start gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        className="w-[14px] h-[14px] rounded-xs accent-primary cursor-pointer mt-0.5"
                        checked={agreement}
                        onChange={(e) => setAgreement(e.target.checked)}
                      />
                      <span className="text-[12px] text-ink-muted-80 leading-relaxed">
                        我已阅读并同意
                        <a href="/terms" target="_blank" className="text-primary hover:underline mx-1">《注册协议》</a>
                        和
                        <a href="#" className="text-primary hover:underline mx-1">《隐私政策》</a>
                      </span>
                    </label>

                    {/* 注册按钮 */}
                    <button
                      type="button"
                      onClick={handleStudentRegister}
                      disabled={loading}
                      className="w-full h-[48px] mt-2 rounded-pill bg-primary text-on-primary text-[15px] font-medium hover:bg-primary-focus active:scale-[0.97] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {loading && (
                        <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                      )}
                      {loading ? '注册中...' : '注册'}
                    </button>
                  </>
                )}
              </div>
            )}

            {/* 教师注册表单 */}
            {activeRole === 'teacher' && (
              <div className="flex flex-col gap-3">
                <input
                  className="input-glass h-[48px] px-4 text-[15px]"
                  placeholder="请输入工号"
                  value={teacherUsername}
                  onChange={(e) => setTeacherUsername(e.target.value)}
                />
                <input
                  className="input-glass h-[48px] px-4 text-[15px]"
                  placeholder="请输入真实姓名"
                  value={teacherName}
                  onChange={(e) => setTeacherName(e.target.value)}
                />
                <select
                  className="input-glass h-[48px] px-4 text-[15px] appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23666%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[length:16px] bg-[right_12px_center] bg-no-repeat pr-10"
                  value={teacherCollege}
                  onChange={(e) => setTeacherCollege(e.target.value)}
                >
                  <option value="">请选择所属学院</option>
                  {colleges.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <input
                  className="input-glass h-[48px] px-4 text-[15px]"
                  placeholder="设置密码（至少6位）"
                  type="password"
                  value={teacherPassword}
                  onChange={(e) => setTeacherPassword(e.target.value)}
                />
                <input
                  className="input-glass h-[48px] px-4 text-[15px]"
                  placeholder="确认密码"
                  type="password"
                  value={teacherConfirmPwd}
                  onChange={(e) => setTeacherConfirmPwd(e.target.value)}
                />

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2 text-[12px] text-yellow-800">
                  教师账号注册后需要管理员审核，审核通过后方可登录。
                </div>

                <button
                  type="button"
                  onClick={handleTeacherRegister}
                  disabled={loading}
                  className="w-full h-[48px] mt-2 rounded-pill bg-primary text-on-primary text-[15px] font-medium hover:bg-primary-focus active:scale-[0.97] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading && (
                    <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                  )}
                  {loading ? '注册中...' : '提交注册'}
                </button>
              </div>
            )}
          </div>

          {/* 底部链接 */}
          <div className="mt-md text-center text-[13px] text-ink-muted-80">
            已有账号？
            <a href="/login" className="text-primary hover:text-primary-focus font-medium ml-1 transition">
              返回登录
            </a>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
