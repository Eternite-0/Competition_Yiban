import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import apiClient from '../api/client';
import { useStore } from '../store/useStore';

type Props = {
  hasData: boolean;
  onSynced: (studentInfo?: Record<string, unknown>) => Promise<void> | void;
};

type Mode = 'webvpn' | 'campus';

export default function AcademicConnectPanel({ hasData, onSynced }: Props) {
  const currentUser = useStore((state) => state.currentUser) as any;
  const defaultUsername = useMemo(
    () => currentUser?.username || currentUser?.studentId || '',
    [currentUser],
  );
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>('webvpn');
  const [baseUrl, setBaseUrl] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [connected, setConnected] = useState(false);
  const [captcha, setCaptcha] = useState('');
  const [teachingUsername, setTeachingUsername] = useState(defaultUsername);
  const [teachingPassword, setTeachingPassword] = useState('');
  const [webvpnUsername, setWebvpnUsername] = useState(defaultUsername);
  const [webvpnPassword, setWebvpnPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [loadingChallenge, setLoadingChallenge] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!teachingUsername && defaultUsername) setTeachingUsername(defaultUsername);
    if (!webvpnUsername && defaultUsername) setWebvpnUsername(defaultUsername);
  }, [defaultUsername, teachingUsername, webvpnUsername]);

  const requestChallenge = async () => {
    setLoadingChallenge(true);
    try {
      const result: any = await apiClient.post('/academic/self/session/challenge', { baseUrl: baseUrl || undefined }, { timeout: 30000 });
      setSessionId(result.sessionId || '');
      setConnected(false);
      setCaptcha(result.captchaBase64 || '');
      setVerificationCode('');
    } catch (error: any) {
      toast.error(error.message || '验证码获取失败，请检查网络或教务地址');
    } finally {
      setLoadingChallenge(false);
    }
  };

  useEffect(() => {
    if (open && mode === 'webvpn' && !sessionId) requestChallenge();
    // Intentionally only run when the dialog/mode changes; a refresh button handles retries.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode]);

  const close = () => {
    if (!submitting) setOpen(false);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!teachingUsername || !teachingPassword) {
      toast.error('请输入教务系统账号和密码');
      return;
    }
    if (mode === 'webvpn' && (!sessionId || !verificationCode)) {
      toast.error('请输入验证码');
      return;
    }
    setSubmitting(true);
    try {
      const result: any = await apiClient.post('/academic/self/session/login', {
        sessionId: mode === 'webvpn' ? sessionId : undefined,
        baseUrl: baseUrl || undefined,
        teachingUsername,
        password: teachingPassword,
        webvpnUsername: mode === 'webvpn' ? webvpnUsername : undefined,
        webvpnPassword: mode === 'webvpn' ? (webvpnPassword || teachingPassword) : undefined,
        verificationCode: mode === 'webvpn' ? verificationCode : undefined,
      }, { timeout: 180000 });
      setSessionId(result.sessionId || sessionId);
      setConnected(true);
      toast.success('教务数据已同步到学业中心');
      setOpen(false);
      await onSynced(result.studentInfo as Record<string, unknown> | undefined);
    } catch (error: any) {
      toast.error(error.message || '教务登录或同步失败');
      if (mode === 'webvpn') {
        setSessionId('');
        setCaptcha('');
        requestChallenge();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const resync = async () => {
    if (!sessionId) {
      setOpen(true);
      return;
    }
    setSubmitting(true);
    try {
      await apiClient.post('/academic/self/sync', { sessionId }, { timeout: 180000 });
      toast.success('教务数据已刷新');
      await onSynced();
    } catch (error: any) {
      toast.error(error.message || '同步失败，请重新登录教务系统');
      setConnected(false);
      setOpen(true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <section className="flex flex-col gap-4 rounded-2xl border border-primary/15 bg-primary-soft/40 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="flex items-start gap-3">
          <span className="material-symbols-outlined mt-0.5 text-[22px] text-primary">account_balance</span>
          <div>
            <p className="text-subhead font-semibold text-ink">连接教务系统</p>
            <p className="mt-1 text-caption leading-relaxed text-body-muted">
              {hasData ? '已同步成绩与课表；教务密码只用于本次请求，不会保存。' : '登录后自动同步个人信息、GPA、成绩和课表到当前页面。'}
            </p>
          </div>
        </div>
        <button type="button" className="btn-primary shrink-0" onClick={connected ? resync : () => setOpen(true)} disabled={submitting}>
          <span className={`material-symbols-outlined text-[17px] ${submitting ? 'animate-spin' : ''}`}>{submitting ? 'progress_activity' : connected ? 'sync' : 'login'}</span>
          {submitting ? '同步中…' : connected ? '重新同步' : '登录并同步'}
        </button>
      </section>

      {open ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-4" role="dialog" aria-modal="true" aria-label="连接教务系统">
          <div className="max-h-[min(760px,calc(100vh-2rem))] w-full max-w-xl overflow-y-auto rounded-2xl border border-hairline bg-canvas p-5 shadow-2xl sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div><p className="text-caption font-semibold tracking-[0.14em] text-primary">ACADEMIC CONNECT</p><h2 className="mt-1 text-title-3 font-semibold text-ink">登录教务系统</h2><p className="mt-1 text-caption text-body-muted">账号密码仅在本次同步请求中使用。</p></div>
              <button type="button" className="grid h-8 w-8 place-items-center rounded-lg text-placeholder hover:bg-hover-overlay hover:text-ink" onClick={close} aria-label="关闭"><span className="material-symbols-outlined text-[19px]">close</span></button>
            </div>

            <div className="mt-5 grid grid-cols-2 rounded-xl bg-canvas-parchment p-1 text-caption">
              <button type="button" className={`rounded-lg px-3 py-2 ${mode === 'webvpn' ? 'bg-canvas font-medium text-primary shadow-sm' : 'text-body-muted'}`} onClick={() => { setMode('webvpn'); setSessionId(''); setCaptcha(''); }}>校外 WebVPN</button>
              <button type="button" className={`rounded-lg px-3 py-2 ${mode === 'campus' ? 'bg-canvas font-medium text-primary shadow-sm' : 'text-body-muted'}`} onClick={() => { setMode('campus'); setSessionId(''); setCaptcha(''); }}>校园网直连</button>
            </div>

            <form className="mt-5 space-y-3.5" onSubmit={submit}>
              <div><label className="field-label" htmlFor="academic-base-url">教务地址（可选）</label><input id="academic-base-url" className="input-glass h-10" value={baseUrl} onChange={(event) => setBaseUrl(event.target.value)} placeholder={mode === 'webvpn' ? '默认使用学校 WebVPN 地址' : '例如 https://jw.example.edu.cn/'} /></div>
              {mode === 'webvpn' ? <>
                <div className="grid gap-3 sm:grid-cols-2"><div><label className="field-label" htmlFor="academic-vpn-user">WebVPN 账号</label><input id="academic-vpn-user" className="input-glass h-10" value={webvpnUsername} onChange={(event) => setWebvpnUsername(event.target.value)} autoComplete="username" /></div><div><label className="field-label" htmlFor="academic-vpn-password">WebVPN 密码</label><input id="academic-vpn-password" className="input-glass h-10" type="password" value={webvpnPassword} onChange={(event) => setWebvpnPassword(event.target.value)} autoComplete="current-password" placeholder="留空则复用教务密码" /></div></div>
                <div><label className="field-label" htmlFor="academic-captcha">验证码</label><div className="flex gap-2"><input id="academic-captcha" className="input-glass h-10 min-w-0 flex-1" value={verificationCode} onChange={(event) => setVerificationCode(event.target.value)} placeholder="请输入图片中的验证码" autoComplete="off" />{captcha ? <img className="h-10 w-28 rounded-lg border border-hairline bg-white object-contain" src={`data:image/png;base64,${captcha}`} alt="WebVPN 验证码" /> : <div className="grid h-10 w-28 place-items-center rounded-lg border border-dashed border-hairline text-caption-2 text-placeholder">{loadingChallenge ? '加载中' : '暂无验证码'}</div>}<button type="button" className="btn-secondary h-10 px-2" onClick={() => { setSessionId(''); setCaptcha(''); requestChallenge(); }} disabled={loadingChallenge} aria-label="刷新验证码"><span className={`material-symbols-outlined text-[17px] ${loadingChallenge ? 'animate-spin' : ''}`}>refresh</span></button></div></div>
              </> : null}
              <div className="grid gap-3 sm:grid-cols-2"><div><label className="field-label" htmlFor="academic-user">教务账号</label><input id="academic-user" className="input-glass h-10" value={teachingUsername} onChange={(event) => setTeachingUsername(event.target.value)} autoComplete="username" /></div><div><label className="field-label" htmlFor="academic-password">教务密码</label><input id="academic-password" className="input-glass h-10" type="password" value={teachingPassword} onChange={(event) => setTeachingPassword(event.target.value)} autoComplete="current-password" /></div></div>
              <div className="flex items-center justify-end gap-2 pt-2"><button type="button" className="btn-secondary" onClick={close} disabled={submitting}>取消</button><button type="submit" className="btn-primary" disabled={submitting || (mode === 'webvpn' && loadingChallenge)}>{submitting ? '同步中…' : '登录并同步'}</button></div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
