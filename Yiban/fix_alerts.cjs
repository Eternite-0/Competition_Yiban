const fs = require('fs');

const files = [
  'src/pages/LoginPage.tsx',
  'src/pages/admin/CompetitionPublish.tsx',
  'src/pages/student/SubmissionUpload.tsx',
  'src/pages/student/TeamRecruitment.tsx',
  'src/pages/teacher/SubmissionAudit.tsx'
];

for (const f of files) {
  let c = fs.readFileSync(f, 'utf8');
  if (!c.includes("import { toast } from 'sonner';")) {
    c = "import { toast } from 'sonner';\n" + c;
  }
  
  c = c.replace(/alert\('发布成功'\);/g, "toast.success('发布成功');");
  c = c.replace(/alert\('已保存为草稿'\);/g, "toast.success('已保存为草稿');");
  
  c = c.replace(/alert\((.*?)\);/g, "toast.error($1);");
  fs.writeFileSync(f, c);
}
console.log('Fixed alerts');
