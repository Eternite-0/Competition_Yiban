import { useEffect, useState, useCallback } from 'react';
import apiClient from '../api/client';

interface CascadeFilterProps {
  onChange: (filters: FilterValues) => void;
  fixedCollege?: string;
  showCollege?: boolean;
  showGrade?: boolean;
  showMajor?: boolean;
  showClass?: boolean;
}

export interface FilterValues {
  college?: string;
  grade?: string;
  major?: string;
  className?: string;
}

export default function CascadeFilter({
  onChange,
  fixedCollege,
  showCollege = true,
  showGrade = true,
  showMajor = true,
  showClass = true,
}: CascadeFilterProps) {
  const [colleges, setColleges] = useState<string[]>([]);
  const [majors, setMajors] = useState<string[]>([]);
  const [grades, setGrades] = useState<string[]>([]);
  const [classes, setClasses] = useState<string[]>([]);

  const [college, setCollege] = useState(fixedCollege || '');
  const [grade, setGrade] = useState('');
  const [major, setMajor] = useState('');
  const [className, setClassName] = useState('');

  useEffect(() => {
    setCollege(fixedCollege || '');
    setMajor('');
    setGrade('');
    setClassName('');
  }, [fixedCollege]);

  // Load colleges on mount
  useEffect(() => {
    if (!showCollege) return;
    apiClient.get('/teacher/colleges').then((data: any) => {
      setColleges(Array.isArray(data) ? data : []);
    }).catch(console.error);
  }, [showCollege]);

  // Load majors when college changes
  useEffect(() => {
    if (!showMajor) return;
    setMajors([]);
    setMajor('');
    apiClient.get('/teacher/majors', { params: { college: college || undefined } }).then((data: any) => {
      setMajors(Array.isArray(data) ? data : []);
    }).catch(console.error);
  }, [college, showMajor]);

  // Load grades when college or major changes
  useEffect(() => {
    if (!showGrade) return;
    setGrades([]);
    setGrade('');
    apiClient.get('/teacher/grades', {
      params: { college: college || undefined, major: major || undefined },
    }).then((data: any) => {
      setGrades(Array.isArray(data) ? data : []);
    }).catch(console.error);
  }, [college, major, showGrade]);

  // Load classes when college, major, or grade changes
  useEffect(() => {
    if (!showClass) return;
    setClasses([]);
    setClassName('');
    apiClient.get('/teacher/classes', {
      params: { college: college || undefined, major: major || undefined, grade: grade || undefined },
    }).then((data: any) => {
      setClasses(Array.isArray(data) ? data : []);
    }).catch(console.error);
  }, [college, major, grade, showClass]);

  // Emit filter changes
  const emitChange = useCallback(
    (c: string, g: string, m: string, cl: string) => {
      onChange({
        college: c || undefined,
        grade: g || undefined,
        major: m || undefined,
        className: cl || undefined,
      });
    },
    [onChange]
  );

  const handleCollege = (v: string) => {
    setCollege(v);
    setMajor('');
    setGrade('');
    setClassName('');
    emitChange(v, '', '', '');
  };
  const handleMajor = (v: string) => {
    setMajor(v);
    setGrade('');
    setClassName('');
    emitChange(college, '', v, '');
  };
  const handleGrade = (v: string) => {
    setGrade(v);
    setClassName('');
    emitChange(college, v, major, '');
  };
  const handleClass = (v: string) => {
    setClassName(v);
    emitChange(college, grade, major, v);
  };

  const selectClass =
    'input-glass h-9 min-w-[120px] !w-auto !py-0 pl-3 pr-9 text-footnote';

  return (
    <div className="flex flex-wrap items-center gap-2">
      {showCollege && (
        <select name="college" value={college} onChange={(e) => handleCollege(e.target.value)} className={selectClass}>
          <option value="">全部学院</option>
          {colleges.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      )}
      {showMajor && (
        <select name="major" value={major} onChange={(e) => handleMajor(e.target.value)} className={selectClass}>
          <option value="">全部专业</option>
          {majors.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      )}
      {showGrade && (
        <select name="grade" value={grade} onChange={(e) => handleGrade(e.target.value)} className={selectClass}>
          <option value="">全部年级</option>
          {grades.map((g) => (
            <option key={g} value={g}>{g}级</option>
          ))}
        </select>
      )}
      {showClass && (
        <select name="className" value={className} onChange={(e) => handleClass(e.target.value)} className={selectClass}>
          <option value="">全部班级</option>
          {classes.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      )}
    </div>
  );
}
