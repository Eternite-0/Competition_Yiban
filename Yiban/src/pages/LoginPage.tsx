import { toast } from 'sonner';
import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useStore } from '../store/useStore';
import type { UserRole } from '../types';
import { motion } from 'framer-motion';
import BrandLogo from '../components/BrandLogo';

const roleTabs: { key: UserRole; label: string }[] = [
  { key: 'student', label: '学生' },
  { key: 'teacher', label: '教师' },
  { key: 'admin', label: '管理员' },
];

const accountPlaceholder: Record<UserRole, string> = {
  student: '学号',
  teacher: '工号',
  admin: '管理员账号',
};

export default function LoginPage() {
  const [activeRole, setActiveRole] = useState<UserRole>('student');
  const [account, setAccount] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const setAuth = useStore((s) => s.setAuth);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [systemStatus, setSystemStatus] = useState<'ok' | 'error' | 'checking'>('checking');

  useEffect(() => {
    const checkSystemStatus = async () => {
      try {
        const { default: apiClient } = await import('../api/client');
        await apiClient.get('/health');
        setSystemStatus('ok');
      } catch {
        setSystemStatus('error');
      }
    };
    checkSystemStatus();
  }, []);

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
      if (res.user.role !== activeRole) {
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
    <div className="auth-shell">
      <header className="flex h-14 items-center justify-between border-b border-hairline bg-canvas px-5">
        <BrandLogo size={32} withWordmark subtitle="校园赛事服务平台" />
        <div className="flex items-center gap-2 text-[12px] text-body-subtle">
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              systemStatus === 'ok' ? 'bg-success' : systemStatus === 'error' ? 'bg-error' : 'bg-placeholder animate-pulse'
            }`}
          />
          {systemStatus === 'ok' ? '服务正常' : systemStatus === 'error' ? '服务异常' : '检测中'}
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
          className="w-full max-w-[400px]"
        >
          <div className="mb-7 flex flex-col items-center text-center">
            <BrandLogo size={56} className="mb-4" />
            <h1 className="text-[26px] font-semibold tracking-tight text-ink">登录到易赛通</h1>
            <p className="mt-2 text-[13.5px] text-body-subtle">校园赛事报名、审核与成长管理平台</p>
          </div>

          <div className="auth-card">
            <div className="auth-tabs" role="tablist" aria-label="登录身份">
              {roleTabs.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  role="tab"
                  aria-selected={activeRole === tab.key}
                  data-active={activeRole === tab.key}
                  className="auth-tab"
                  onClick={() => setActiveRole(tab.key)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <form className="flex flex-col gap-3.5" onSubmit={handleLogin}>
              <div>
                <label className="field-label" htmlFor="login-account">账号</label>
                <input
                  id="login-account"
                  className="input-glass h-11"
                  type="text"
                  value={account}
                  onChange={(e) => setAccount(e.target.value)}
                  autoComplete="username"
                  placeholder={accountPlaceholder[activeRole]}
                />
              </div>

              <div>
                <label className="field-label" htmlFor="login-password">密码</label>
                <div className="relative">
                  <input
                    id="login-password"
                    className="input-glass h-11 pr-11"
                    placeholder="请输入密码"
                    type={showPwd ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                  />
                  <button
                    className="absolute right-1.5 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-md text-placeholder hover:bg-hover-overlay hover:text-ink"
                    type="button"
                    onClick={() => setShowPwd(!showPwd)}
                    tabIndex={-1}
                    aria-label={showPwd ? '隐藏密码' : '显示密码'}
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      {showPwd ? 'visibility' : 'visibility_off'}
                    </span>
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-[12.5px]">
                <label className="flex cursor-pointer items-center gap-2 text-body-muted">
                  <input type="checkbox" className="h-3.5 w-3.5 accent-primary" />
                  记住账号
                </label>
                <button type="button" className="muted-link" onClick={() => toast('请联系学院管理员重置密码')}>
                  忘记密码？
                </button>
              </div>

              <button className="btn-primary mt-1 h-11 w-full text-[14px]" type="submit" disabled={loading}>
                {loading && <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>}
                {loading ? '登录中…' : '继续'}
              </button>

              <button
                type="button"
                className="btn-secondary h-11 w-full"
                onClick={() => toast('请前往校园门户进行统一身份认证')}
              >
                <span className="material-symbols-outlined text-[18px]">school</span>
                统一身份认证
              </button>
            </form>

            <p className="mt-5 text-center text-[13px] text-body-subtle">
              还没有账号？
              <Link to="/register" className="ml-1 font-medium text-primary hover:text-primary-focus">
                注册
              </Link>
            </p>
          </div>

          <p className="mt-6 text-center text-[11.5px] leading-relaxed text-placeholder">
            登录即表示同意
            <Link to="/terms" className="mx-1 text-body-muted hover:text-ink">服务协议</Link>
            与
            <Link to="/terms" className="mx-1 text-body-muted hover:text-ink">隐私政策</Link>
          </p>
        </motion.div>
      </main>
    </div>
  );
}
