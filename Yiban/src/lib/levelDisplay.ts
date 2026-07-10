/** 将后端 level 统一展示为中文（兼容历史英文值） */
const LEVEL_MAP: Record<string, string> = {
  school: '校级',
  School: '校级',
  SCHOOL: '校级',
  'school-level': '校级',
  national: '国家级',
  National: '国家级',
  NATIONAL: '国家级',
  province: '省级',
  provincial: '省级',
  Province: '省级',
  PROVINCE: '省级',
  college: '院级',
  College: '院级',
  institute: '院级',
  国级: '国家级',
};

export function displayLevel(level?: string | null): string {
  if (!level) return '未分级';
  const trimmed = String(level).trim();
  return LEVEL_MAP[trimmed] || trimmed;
}

export function levelChipClass(level?: string | null): string {
  const label = displayLevel(level);
  switch (label) {
    case '国家级':
      return 'chip chip-national';
    case '省级':
      return 'chip chip-province';
    case '校级':
    case '院级':
      return 'chip chip-school';
    default:
      return 'chip';
  }
}
