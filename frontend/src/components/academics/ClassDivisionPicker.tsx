import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Select } from '../ui/Input';
import { academicService } from '../../services';
import { useAcademicLabels } from '../../hooks/useAcademicLabels';
import type { Standard } from '../../types';

interface ClassDivisionPickerProps {
  standardId?: string;
  divisionName?: string;
  onStandardChange: (standardId: string) => void;
  onDivisionChange: (divisionName: string) => void;
  standardLabel?: string;
  divisionLabel?: string;
  required?: boolean;
  className?: string;
  /** When set, skips authenticated standards fetch (public admission form) */
  standards?: Standard[];
  standardsLoading?: boolean;
}

export function ClassDivisionPicker({
  standardId,
  divisionName,
  onStandardChange,
  onDivisionChange,
  standardLabel,
  divisionLabel,
  required = true,
  className = '',
  standards: standardsProp,
  standardsLoading = false,
}: ClassDivisionPickerProps) {
  const tenantLabels = useAcademicLabels();
  const classLabel = standardLabel ?? (required ? `${tenantLabels.class} *` : tenantLabels.class);
  const sectionLabel = divisionLabel ?? (required ? `${tenantLabels.section} *` : tenantLabels.section);

  const { data: standardsRes, isLoading: fetchLoading } = useQuery({
    queryKey: ['standards'],
    queryFn: academicService.listStandards,
    enabled: !standardsProp,
  });

  const standards = standardsProp ?? standardsRes?.data ?? [];
  const isLoading = standardsProp ? standardsLoading : fetchLoading;

  const selectedStandard = useMemo(
    () => standards.find((s: Standard) => s._id === standardId),
    [standards, standardId]
  );

  const standardOptions = [
    { value: '', label: isLoading ? 'Loading classes...' : `Select ${tenantLabels.class.toLowerCase()}` },
    ...standards.map((s: Standard) => ({
      value: s._id,
      label: `${s.name}${s.totalStudents != null ? ` (${s.totalStudents} students)` : ''}`,
    })),
  ];

  const divisionOptions = [
    { value: '', label: standardId ? `Select ${tenantLabels.section.toLowerCase()}` : `Select ${tenantLabels.class.toLowerCase()} first` },
    ...(selectedStandard?.divisions || []).map((d) => ({
      value: d.name,
      label: `${d.name}${d.strength != null ? ` (${d.strength} students)` : ''}`,
    })),
  ];

  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 ${className}`}>
      <Select
        label={classLabel}
        value={standardId || ''}
        onChange={(e) => {
          onStandardChange(e.target.value);
          onDivisionChange('');
        }}
        options={standardOptions}
      />
      <Select
        label={sectionLabel}
        value={divisionName || ''}
        onChange={(e) => onDivisionChange(e.target.value)}
        options={divisionOptions}
        disabled={!standardId}
      />
    </div>
  );
}

export function useStandards() {
  return useQuery({
    queryKey: ['standards'],
    queryFn: academicService.listStandards,
  });
}
