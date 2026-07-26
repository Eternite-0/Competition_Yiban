import { chromium } from 'playwright';
import fs from 'node:fs';

const THEME = process.argv[2] || 'light';
const OUT = '.shots';
fs.mkdirSync(OUT, { recursive: true });

const USER = { id: 1, username: '20230101', realName: '张三', role: 'student', department: '计算机学院', studentId: '20230101' };

const NAMES = ['全国大学生数学建模竞赛', '中国国际大学生创新大赛', '蓝桥杯软件设计大赛', 'ACM-ICPC 程序设计竞赛', '全国大学生电子设计竞赛', '互联网+创新创业大赛'];
const COMPS = NAMES.map((n, i) => ({
  id: i + 1, name: n, title: n,
  level: ['国家级', '国家级', '省级', '国家级', '省级', '校级'][i],
  category: ['学科竞赛', '创新创业', '程序设计', '程序设计', '电子技术', '创新创业'][i],
  status: ['published', 'published', 'published', 'closed', 'published', 'draft'][i],
  organizer: '教务处 · 计算机学院',
  deadline: '2026-09-30', endTime: '2026-09-30 23:59:59', startTime: '2026-07-01 00:00:00',
  description: '面向全校本科生的高水平学科竞赛，鼓励跨学院组队参与。',
  views: 1200 + i * 137, teams: 24 + i * 5, coverUrl: null, tags: ['团队赛', '可加学分'],
}));
const PAGE = { records: COMPS, total: COMPS.length, current: 1, size: 10, pages: 1 };

const ok = (data) => ({ status: 200, contentType: 'application/json', body: JSON.stringify({ code: 200, message: 'success', data }) });

const browser = await chromium.launch({ headless: true, channel: 'msedge', args: ['--no-sandbox'] });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });

// 必须锚定到根路径：'**/api/**' 会误伤 Vite 的 /src/api/client.ts 模块 URL
await ctx.route('http://localhost:3000/api/**', (route) => {
  const url = route.request().url();
  if (url.includes('/auth/me')) return route.fulfill(ok(USER));
  if (url.includes('/competition/detail')) return route.fulfill(ok({ ...COMPS[0], content: '<h2>竞赛简介</h2><p>本竞赛旨在培养学生的数学建模能力与团队协作精神，面向全校本科生开放。</p><h3>参赛要求</h3><ul><li>全日制在校本科生</li><li>每队 3 人，需指定队长</li><li>需在截止前提交完整论文</li></ul>' }));
  if (url.includes('/competition/list')) return route.fulfill(ok(PAGE));
  if (url.includes('/message/list')) return route.fulfill(ok({ records: [
    { id: 1, fromUser: 0, toUser: 1, title: '报名审核通过', content: '你报名的「全国大学生数学建模竞赛」已通过学院初审，请留意后续赛程安排。', isRead: 0, createTime: new Date(Date.now() - 6e5).toISOString() },
    { id: 2, fromUser: 0, toUser: 1, title: '成果需补充材料', content: '请补充上传作品说明文档后重新提交。', isRead: 0, createTime: new Date(Date.now() - 864e5).toISOString() },
    { id: 3, fromUser: 0, toUser: 1, title: '新赛事发布', content: '「蓝桥杯软件设计大赛」已开放报名。', isRead: 1, createTime: new Date(Date.now() - 3 * 864e5).toISOString() },
  ], total: 3 }));
  if (url.includes('/growth/radar')) return route.fulfill(ok({ dimensions: [
    { name: '学科竞赛', score: 82 }, { name: '创新创业', score: 64 }, { name: '志愿服务', score: 71 },
    { name: '文体活动', score: 55 }, { name: '科研成果', score: 48 }, { name: '社会实践', score: 66 },
  ] }));
  return route.fulfill(ok({ records: [], total: 0, current: 1, size: 10, pages: 0 }));
});

const p = await ctx.newPage();
p.on('pageerror', (e) => console.log('[pageerror]', String(e).slice(0, 300)));

// 先落到同源页面再写 localStorage，避免 about:blank 下的 SecurityError
await p.goto('http://localhost:3000/login', { waitUntil: 'domcontentloaded' });
await p.evaluate((t) => {
  localStorage.setItem('theme', t);
  localStorage.setItem('sidebarOpen', 'true');
}, THEME);
await p.reload({ waitUntil: 'networkidle' });
await p.waitForTimeout(1500);
await p.screenshot({ path: `${OUT}/${THEME}-login.png` });
console.log('ok   login');

await p.evaluate(() => localStorage.setItem('token', 'stub-token'));

const shots = [
  ['competitions', 'http://localhost:3000/student/competitions'],
  ['detail', 'http://localhost:3000/student/competitions/1'],
  ['home', 'http://localhost:3000/student/home'],
  ['growth', 'http://localhost:3000/student/growth'],
];

for (const [name, url] of shots) {
  try {
    await p.goto(url, { waitUntil: 'networkidle', timeout: 20000 });
    await p.waitForTimeout(1500);
    const len = (await p.innerText('body').catch(() => '')).length;
    await p.screenshot({ path: `${OUT}/${THEME}-${name}.png` });
    console.log('ok  ', name, '(text len ' + len + ')');
  } catch (e) {
    console.log('FAIL', name, e.message.split('\n')[0]);
  }
}

try {
  const bell = await p.$('button[aria-label="消息通知"]');
  if (bell) {
    await bell.click();
    await p.waitForTimeout(800);
    await p.screenshot({ path: `${OUT}/${THEME}-popover.png` });
    console.log('ok   popover');
  }
} catch (e) { console.log('FAIL popover', e.message.split('\n')[0]); }

await browser.close();
