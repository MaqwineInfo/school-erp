import { useQuery } from '@tanstack/react-query';
import axios from '../lib/api';
import { LABELS as DEFAULT_LABELS } from '../constants/systemFlow';

export function useAcademicLabels() {
  const { data } = useQuery({
    queryKey: ['school-profile-labels'],
    queryFn: () => axios.get('/settings/profile').then((r) => r.data.data),
    staleTime: 10 * 60 * 1000,
  });

  const settings = data?.settings || {};
  return {
    class: settings.standardLabel || DEFAULT_LABELS.class,
    section: settings.divisionLabel === 'Division' ? 'Section' : (settings.divisionLabel || DEFAULT_LABELS.section),
  };
}
