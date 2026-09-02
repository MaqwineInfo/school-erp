import { useQuery } from '@tanstack/react-query';
import axios from '../../lib/api';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';

export default function SuperAdminAnalyticsPage() {
  const { data: tenants } = useQuery({
    queryKey: ['super-tenants-analytics'],
    queryFn: () => axios.get('/plans/tenants').then(r => r.data.data),
  });

  const list = Array.isArray(tenants) ? tenants : [];
  const active = list.filter((t: { status: string }) => ['active', 'trial'].includes(t.status)).length;
  const totalStudents = list.reduce((s: number, t: { studentCount?: number }) => s + (t.studentCount || 0), 0);

  return (
    <div className="p-6 space-y-6">
      <PageHeader title="Global Analytics" description="Platform-wide metrics (WF-0030)" breadcrumb={[{ label: 'Super Admin' }, { label: 'Analytics' }]} />
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-6 text-center"><div className="text-3xl font-bold text-blue-700">{list.length}</div><div className="text-sm text-gray-500">Total Schools</div></Card>
        <Card className="p-6 text-center"><div className="text-3xl font-bold text-green-600">{active}</div><div className="text-sm text-gray-500">Active / Trial</div></Card>
        <Card className="p-6 text-center"><div className="text-3xl font-bold text-purple-700">{totalStudents}</div><div className="text-sm text-gray-500">Students (all tenants)</div></Card>
        <Card className="p-6 text-center"><div className="text-3xl font-bold text-orange-600">{list.filter((t: { status: string }) => t.status === 'onboarding').length}</div><div className="text-sm text-gray-500">Onboarding</div></Card>
      </div>
    </div>
  );
}
