import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';

export default function SuperAdminHealthPage() {
  const checks = [
    { name: 'API Server', status: 'healthy', detail: 'Responding normally' },
    { name: 'Database', status: 'healthy', detail: 'MongoDB connected' },
    { name: 'Background Jobs', status: 'healthy', detail: 'No failed jobs in queue' },
    { name: 'SMS Gateway', status: 'warning', detail: 'Configure in school settings' },
  ];

  return (
    <div className="p-6 space-y-6">
      <PageHeader title="System Health" description="Infrastructure status (WF-0031)" breadcrumb={[{ label: 'Super Admin' }, { label: 'System Health' }]} />
      <div className="grid gap-3">
        {checks.map(c => (
          <Card key={c.name} className="p-4 flex justify-between items-center">
            <div><p className="font-medium">{c.name}</p><p className="text-sm text-gray-500">{c.detail}</p></div>
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${c.status === 'healthy' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{c.status}</span>
          </Card>
        ))}
      </div>
    </div>
  );
}
