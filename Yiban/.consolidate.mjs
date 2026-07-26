import fs from 'node:fs';
import path from 'node:path';

// 28 个离散字号 → 8 档语义字阶。只动文字，不动图标。
const MAP = {
  '10px': 'text-caption-2', '11px': 'text-caption-2', '11.5px': 'text-caption-2',
  '12px': 'text-caption', '12.5px': 'text-caption',
  '13px': 'text-footnote', '13.5px': 'text-footnote',
  '14px': 'text-subhead', '14.5px': 'text-subhead', '15px': 'text-subhead',
  '16px': 'text-callout', '17px': 'text-callout',
  '18px': 'text-title-3', '19px': 'text-title-3', '20px': 'text-title-3',
  '22px': 'text-title-2', '24px': 'text-title-2', '26px': 'text-title-2',
  // 28px 以上是营销大标题，保持原样
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
const perSize = {};

// 匹配 className="..." 与 className={`...`}，逐个 class 串独立判断
const CLASS_ATTR = /className=(?:"([^"]*)"|\{`([^`]*)`\})/gs;

for (const file of files) {
  const src = fs.readFileSync(file, 'utf8');
  let touched = false;

  const out = src.replace(CLASS_ATTR, (whole, dq, tpl) => {
    const body = dq !== undefined ? dq : tpl;
    // 图标 span 的 text-[Npx] 是字号即图标尺寸，绝不能当文字改
    if (body.includes('material-symbols-outlined')) {
      stats.skippedIcon += (body.match(/text-\[[0-9.]+px\]/g) || []).length;
      return whole;
    }
    const next = body.replace(/text-\[([0-9.]+px)\]/g, (m, size) => {
      const to = MAP[size];
      if (!to) { stats.skippedLarge++; return m; }
      stats.replaced++;
      perSize[size] = (perSize[size] || 0) + 1;
      return to;
    });
    if (next === body) return whole;
    touched = true;
    return dq !== undefined ? `className="${next}"` : 'className={`' + next + '`}';
  });

  if (touched) { fs.writeFileSync(file, out, 'utf8'); stats.files++; }
}

console.log('files changed :', stats.files);
console.log('replaced      :', stats.replaced);
console.log('skipped icon  :', stats.skippedIcon);
console.log('skipped >26px :', stats.skippedLarge);
console.log('\nby source size:');
for (const [k, v] of Object.entries(perSize).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${k.padEnd(8)} -> ${MAP[k].padEnd(15)} ${v}`);
}
