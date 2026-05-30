import { toast } from 'sonner';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import type { UserRole } from '../types';
import { motion } from 'framer-motion';

const roleTabs: { key: UserRole; label: string }[] = [
  { key: 'student', label: '学生' },
  { key: 'teacher', label: '教师' },
  { key: 'admin', label: '管理员' },
];

const announcements: Array<{
  tag: string;
  tone: 'primary' | 'warning' | 'default';
  title: string;
  date: string;
}> = [
  {
    tag: '报名',
    tone: 'primary' as const,
    title: '2026 年"蓝桥杯"校内选拔赛开放报名',
    date: '2026-05-20',
  },
  {
    tag: '截止',
    tone: 'default' as const,
    title: '"挑战杯"创业计划书提交将于本周五截止',
    date: '2026-05-23',
  },
  {
    tag: '通知',
    tone: 'default' as const,
    title: '系统于 5 月 28 日 22:00–24:00 例行维护',
    date: '2026-05-18',
  },
];

export default function LoginPage() {
  const [activeRole, setActiveRole] = useState<UserRole>('student');
  const [account, setAccount] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const setAuth = useStore((s) => s.setAuth);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!account || !password) {
      toast.error('请输入账号和密码');
      return;
    }
    try {
      setLoading(true);
      const { default: apiClient } = await import('../api/client');
      const res: any = await apiClient.post('/auth/login', { username: account, password });
      const roleMatch = res.user.role === activeRole;
      if (!roleMatch) {
        toast.error('账号角色与当前选择的入口不符');
        setLoading(false);
        return;
      }
      const normalizedUser = {
        ...res.user,
        id: String(res.user.id),
        name: res.user.realName || res.user.username || '用户',
      };
      setAuth(normalizedUser, res.token);
      navigate(`/${res.user.role}`);
    } catch (err: any) {
      toast.error(err.message || '登录失败，请检查账号密码');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden text-ink antialiased">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-canvas-parchment" />

        <div className="h-[44px] flex items-center px-xl text-[12px] tracking-tight text-ink bg-canvas border-b border-hairline">
        <span className="flex items-center gap-2 font-medium">
          <span className="material-symbols-outlined text-[16px] text-primary icon-fill">workspace_premium</span>
          易赛通 · 学生竞赛管理平台
        </span>
        <span className="ml-auto text-ink-muted-48 hidden sm:inline">
          技术支持 · 学生处信息中心
        </span>
      </div>

      <div className="min-h-[calc(100vh-44px)] grid lg:grid-cols-[1.1fr_0.9fr] gap-xxl items-center px-xl py-xxl max-w-[1280px] mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="hidden lg:flex flex-col gap-lg pr-xl"
        >
          <div className="flex flex-col gap-3">
            <span className="text-[12px] uppercase tracking-[0.24em] text-ink-muted-48">
              Yiban Suite · 2025–2026 学年
            </span>
            <h1 className="font-display font-semibold text-[52px] leading-[1.05] tracking-[-0.025em] text-ink">
              易赛通
              <br />
              <span className="text-primary">学生竞赛</span>管理平台
            </h1>
            <p className="text-[15px] text-ink-muted-80 max-w-[460px] leading-relaxed">
              校级统一赛事报名与成果归档系统，由学生处与教务处联合运维。
            </p>
          </div>

          <div className="glass-tint flex items-center gap-lg px-md py-3 max-w-[520px]">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-primary">calendar_month</span>
              <span className="text-[13px] text-ink">2025–2026 春季学期</span>
            </div>
            <span className="w-px h-4 bg-hairline" />
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-primary opacity-60 animate-ping" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
              </span>
              <span className="text-[13px] text-ink-muted-80">系统运行正常</span>
            </div>
          </div>

          <section className="glass p-lg max-w-[520px]">
            <div className="flex items-center justify-between mb-md">
              <h3 className="text-[15px] font-semibold tracking-tight text-ink flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-primary">campaign</span>
                系统公告
              </h3>
              <a href="#" className="text-[12px] text-primary hover:text-primary-focus font-medium">
                更多 →
              </a>
            </div>
            <ul className="flex flex-col">
              {announcements.map((n, i) => (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.15 + i * 0.06, duration: 0.4 }}
                  className="py-3 border-b border-hairline last:border-0 flex items-start gap-3 cursor-pointer group"
                >
                  <span
                    className={
                      n.tone === 'primary'
                        ? 'chip chip-primary shrink-0'
                        : n.tone === 'warning'
                          ? 'chip chip-warning shrink-0'
                          : 'chip shrink-0'
                    }
                  >
                    {n.tag}
                  </span>
                  <span className="flex-1 text-[13px] text-ink leading-snug group-hover:text-primary transition">
                    {n.title}
                  </span>
                  <span className="text-[11px] text-ink-muted-48 tabular-nums shrink-0 mt-0.5">
                    {n.date}
                  </span>
                </motion.li>
              ))}
            </ul>
          </section>

          <div className="flex items-center gap-md text-[12px] text-ink-muted-80 max-w-[520px]">
            <span className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px] text-ink-muted-48">support_agent</span>
              客服热线 0571-8888-0000
            </span>
            <span className="w-px h-3 bg-hairline" />
            <span className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px] text-ink-muted-48">mail</span>
              yiban@school.edu.cn
            </span>
            <span className="w-px h-3 bg-hairline" />
            <a href="#" className="hover:text-primary transition flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px]">help</span>
              使用手册
            </a>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-[420px] mx-auto lg:mx-0 lg:ml-auto"
        >
          <div className="glass-strong px-xl py-xl">
            <div className="mb-lg">
              <h2 className="font-display font-semibold text-[28px] leading-tight tracking-tight text-ink">
                账号登录
              </h2>
              <p className="text-[13px] text-ink-muted-48 mt-1.5">
                请使用校园账号进入对应身份入口
              </p>
            </div>

            <div className="flex w-full p-1 mb-md bg-canvas-parchment rounded-pill border border-hairline">
              {roleTabs.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveRole(tab.key)}
                  className={`flex-1 py-2 text-[13px] text-center transition-all rounded-pill ${
                    activeRole === tab.key
                      ? 'bg-canvas text-ink font-semibold shadow-sm'
                      : 'text-ink-muted-48 hover:text-ink'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <form className="flex flex-col gap-3" onSubmit={handleLogin}>
              <label className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-4 text-ink-muted-48 text-[19px] pointer-events-none">
                  badge
                </span>
                <input
                  className="input-glass h-[48px] pl-12 text-[15px]"
                  placeholder={activeRole === 'student' ? '学号' : activeRole === 'teacher' ? '工号' : '管理员账号'}
                  type="text"
                  value={account}
                  onChange={(e) => setAccount(e.target.value)}
                  autoComplete="username"
                />
              </label>

              <label className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-4 text-ink-muted-48 text-[19px] pointer-events-none">
                  lock
                </span>
                <input
                  className="input-glass h-[48px] pl-12 pr-12 text-[15px]"
                  placeholder="密码"
                  type={showPwd ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
                <button
                  className="absolute right-3 w-8 h-8 grid place-items-center rounded-full text-ink-muted-48 hover:text-ink hover:bg-primary/6 transition"
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  tabIndex={-1}
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {showPwd ? 'visibility' : 'visibility_off'}
                  </span>
                </button>
              </label>

              <div className="flex items-center justify-between text-[12px] mt-0.5">
                <label className="flex items-center gap-2 cursor-pointer text-ink-muted-80 hover:text-ink transition">
                  <input
                    type="checkbox"
                    className="w-[14px] h-[14px] rounded-xs accent-primary cursor-pointer"
                  />
                  记住账号
                </label>
                <a className="text-primary hover:text-primary-focus transition" href="#">
                  忘记密码？
                </a>
              </div>

              <button
                className="w-full h-[48px] mt-2 rounded-pill bg-primary text-on-primary text-[15px] font-medium hover:bg-primary-focus active:scale-[0.97] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                type="submit"
                disabled={loading}
              >
                {loading && (
                  <span className="material-symbols-outlined animate-spin text-[18px]">
                    progress_activity
                  </span>
                )}
                {loading ? '登录中…' : '登录'}
              </button>

              <div className="flex items-center gap-3 my-1">
                <span className="flex-1 h-px bg-hairline" />
                <span className="text-[11px] text-ink-muted-48">其他登录方式</span>
                <span className="flex-1 h-px bg-hairline" />
              </div>

              <button
                type="button"
              className="w-full h-[44px] rounded-pill bg-canvas border border-hairline text-[13px] text-ink hover:border-primary/30 hover:text-primary transition flex items-center justify-center gap-2"
                onClick={() => toast('请前往校园门户进行统一身份认证')}
              >
                <span className="material-symbols-outlined text-[18px]">school</span>
                统一身份认证 (CAS)
              </button>
            </form>

            <div className="mt-lg text-center text-[13px] text-ink-muted-80">
              还没有账号？
              <a href="/register" className="text-primary hover:text-primary-focus font-medium ml-1 transition">
                注册账号
              </a>
            </div>
          </div>

          <div className="mt-md text-center text-[11px] text-ink-muted-48 leading-relaxed">
            <p>
              登录即表示同意
              <a href="#" className="text-primary hover:underline mx-1">服务协议</a>
              与
              <a href="#" className="text-primary hover:underline mx-1">隐私政策</a>
            </p>
            <p className="mt-1">© 2026 学生处信息中心 · 浙 ICP 备 XXXXXXXX 号</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
