import fs from 'node:fs';
import path from 'node:path';

// 第二轮：按字符串字面量处理，覆盖三元表达式 / 独立常量 / `...`.trim() 等
// 第一轮 className= 正则没能匹配到的写法。
const MAP = {
  '10px': 'text-caption-2', '11px': 'text-caption-2', '11.5px': 'text-caption-2',
  '12px': 'text-caption', '12.5px': 'text-caption',
  '13px': 'text-footnote', '13.5px': 'text-footnote',
  '14px': 'text-subhead', '14.5px': 'text-subhead', '15px': 'text-subhead',
  '16px': 'text-callout', '17px': 'text-callout',
  '18px': 'text-title-3', '19px': 'text-title-3', '20px': 'text-title-3',
  '22px': 'text-title-2', '24px': 'text-title-2', '26px': 'text-title-2',
};

const files = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.tsx?$/.test(e.name)) files.push(p);
  }
})('src');

const stats = { files: 0, replaced: 0, skippedIcon: 0, skippedLarge: 0 };

// 单引号 / 双引号 / 反引号 字符串字面量
const STRING_LIT = /'([^'\\\n]*)'|"([^"\\\n]*)"|`([^`\\]*)`/g;

for (const file of files) {
  const src = fs.readFileSync(file, 'utf8');
  let touched = false;

  const out = src.replace(STRING_LIT, (whole, sq, dq, tpl) => {
    const body = sq ?? dq ?? tpl;
    if (body === undefined || !/text-\[[0-9.]+px\]/.test(body)) return whole;

    // 图标尺寸不能当文字改
    if (body.includes('material-symbols-outlined')) {
      stats.skippedIcon += (body.match(/text-\[[0-9.]+px\]/g) || []).length;
      return whole;
    }
    const next = body.replace(/text-\[([0-9.]+px)\]/g, (m, size) => {
      const to = MAP[size];
      if (!to) { stats.skippedLarge++; return m; }
      stats.replaced++;
      return to;
    });
    if (next === body) return whole;
    touched = true;
    const q = sq !== undefined ? "'" : dq !== undefined ? '"' : '`';
    return q + next + q;
  });

  if (touched) { fs.writeFileSync(file, out, 'utf8'); stats.files++; }
}

console.log('files changed :', stats.files);
console.log('replaced      :', stats.replaced);
console.log('skipped icon  :', stats.skippedIcon);
console.log('skipped >26px :', stats.skippedLarge);
