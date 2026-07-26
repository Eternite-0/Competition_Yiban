import { chromium } from 'playwright';
import fs from 'node:fs';

const THEME = process.argv[2] || 'light';
const OUT = '.shots';
fs.mkdirSync(OUT, { recursive: true });

const ROLE = process.argv[3] || 'student';
const USER = {
  student: { id: 1, username: '20230101', realName: '张三', role: 'student', department: '计算机学院', studentId: '20230101' },
  teacher: { id: 2, username: 'teacher1', realName: '李老师', role: 'teacher', department: '计算机学院' },
  admin: { id: 3, username: 'admin', realName: '管理员', role: 'admin', department: '教务处' },
}[ROLE];
const NAMES = ['全国大学生数学建模竞赛', '中国国际大学生创新大赛', '蓝桥杯软件设计大赛', 'ACM-ICPC 程序设计竞赛', '全国大学生电子设计竞赛', '互联网+创新创业大赛'];
const COMPS = NAMES.map((n, i) => ({
  id: i + 1, name: n, title: n,
  level: ['国家级', '国家级', '省级', '国家级', '省级', '校级'][i],
  category: ['学科竞赛', '创新创业', '程序设计', '程序设计', '电子技术', '创新创业'][i],
  status: ['published', 'published', 'published', 'closed', 'published', 'draft'][i],
  organizer: '教务处 · 计算机学院', deadline: '2026-09-30',
  endTime: '2026-09-30 23:59:59', startTime: '2026-07-01 00:00:00',
  description: '面向全校本科生的高水平学科竞赛，鼓励跨学院组队参与。',
  views: 1200 + i * 137, teams: 24 + i * 5, coverUrl: null, tags: ['团队赛', '可加学分'],
}));
const PAGE = { records: COMPS, total: COMPS.length, current: 1, size: 10, pages: 1 };
const ok = (data) => ({ status: 200, contentType: 'application/json', body: JSON.stringify({ code: 200, message: 'success', data }) });

const browser = await chromium.launch({ headless: true, channel: 'msedge', args: ['--no-sandbox'] });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });

// 必须锚定根路径：'**/api/**' 会误伤 Vite 的 /src/api/client.ts 模块 URL
await ctx.route('http://localhost:3000/api/**', (route) => {
  const url = route.request().url();
  if (url.includes('/auth/me')) return route.fulfill(ok(USER));
  if (url.includes('/competition/detail')) return route.fulfill(ok({ ...COMPS[0], content: '<h2>竞赛简介</h2><p>本竞赛旨在培养学生的数学建模能力与团队协作精神，面向全校本科生开放。</p><h3>参赛要求</h3><ul><li>全日制在校本科生</li><li>每队 3 人，需指定队长</li></ul>' }));
  if (url.includes('/competition/list')) return route.fulfill(ok(PAGE));
  if (url.includes('/message/list')) return route.fulfill(ok({ records: [
    { id: 1, fromUser: 0, toUser: 1, title: '报名审核通过', content: '你报名的「全国大学生数学建模竞赛」已通过学院初审，请留意后续赛程安排。', isRead: 0, createTime: new Date(Date.now() - 6e5).toISOString() },
    { id: 2, fromUser: 0, toUser: 1, title: '成果需补充材料', content: '请补充上传作品说明文档后重新提交。', isRead: 0, createTime: new Date(Date.now() - 864e5).toISOString() },
  ], total: 2 }));
  return route.fulfill(ok({ records: [], total: 0, current: 1, size: 10, pages: 0 }));
});

const p = await ctx.newPage();
p.on('pageerror', (e) => console.log('[pageerror]', String(e).slice(0, 300)));

await p.goto('http://localhost:3000/login', { waitUntil: 'domcontentloaded' });
await p.evaluate((t) => { localStorage.setItem('theme', t); localStorage.setItem('sidebarOpen', 'true'); }, THEME);
await p.reload({ waitUntil: 'networkidle' });
await p.waitForTimeout(1500);
await p.screenshot({ path: `${OUT}/${THEME}-login.png` });
console.log('ok   login');

await p.evaluate(() => localStorage.setItem('token', 'stub-token'));

const ROUTES = {
  student: ['competitions', 'competitions/1', 'registrations', 'growth', 'calendar', 'teams', 'works', 'progress'],
  teacher: ['audit', 'college-overview', 'student-competitions', 'student-growth'],
  admin: ['publish', 'users', 'drafts', 'announcements', 'roster', 'registration-audit'],
}[ROLE];

for (const route of ROUTES) {
  const name = route.replace(/\//g, '-');
  const url = `http://localhost:3000/${ROLE}/${route}`;
  try {
    await p.goto(url, { waitUntil: 'networkidle', timeout: 20000 });
    await p.waitForTimeout(1400);
    if (p.url().includes('/login')) { console.log('SKIP', name, '(redirected to login)'); continue; }
    await p.screenshot({ path: `${OUT}/${THEME}-${ROLE}-${name}.png` });
    console.log('ok  ', `${ROLE}/${name}`);
  } catch (e) { console.log('FAIL', name, e.message.split('\n')[0]); }
}

await browser.close();
