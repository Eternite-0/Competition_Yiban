const fs = require('fs');
const files = [
  'src/pages/admin/ExcellentWorks.tsx',
  'src/pages/student/CompetitionDetail.tsx',
  'src/pages/student/RegistrationWorkbench.tsx',
  'src/pages/student/StudentHome.tsx',
  'src/pages/teacher/TeacherStudentCompetitions.tsx',
  'src/pages/teacher/TeacherStudentGrowth.tsx'
];

for (const f of files) {
  let c = fs.readFileSync(f, 'utf8');
  c = c.replace(/import \{ useStore \} from '.*?\/store\/useStore';/g, "import { useStore } from '../../store/legacyStore';");
  fs.writeFileSync(f, c);
}
