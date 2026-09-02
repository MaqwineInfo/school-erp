import { useQuery } from '@tanstack/react-query';
import { Building2, Users, TrendingUp, AlertTriangle } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import axios from '../../lib/api';
import { Link } from 'react-router-dom';

type Stats = {
  total: number;
  active: number;
  trial: number;
  suspended: number;
  byPlan: Array<{ _id: string; count: number }>;
};

export default function SuperAdminDashboard() {
  const { data: stats } = useQuery<Stats>({
    queryKey: ['saas-stats'],
    queryFn: () => axios.get('/plans/saas-stats').then(r => r.data.data),
  });

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Platform Dashboard"
        description="Monitor all schools, subscriptions, and platform health (WF-0020)"
        breadcrumb={[{ label: 'Super Admin' }, { label: 'Platform Dashboard' }]}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="text-center p-5">
          <Building2 className="w-8 h-8 mx-auto text-blue-600 mb-2" />
          <div className="text-3xl font-bold">{stats?.total || 0}</div>
          <div className="text-xs text-gray-500 mt-1">Total Schools</div>
        </Card>
        <Card className="text-center p-5 bg-green-50 border-green-200">
          <TrendingUp className="w-8 h-8 mx-auto text-green-600 mb-2" />
          <div className="text-3xl font-bold text-green-700">{stats?.active || 0}</div>
          <div className="text-xs text-green-600 mt-1">Active Tenants</div>
        </Card>
        <Card className="text-center p-5 bg-yellow-50 border-yellow-200">
          <Users className="w-8 h-8 mx-auto text-yellow-600 mb-2" />
          <div className="text-3xl font-bold text-yellow-700">{stats?.trial || 0}</div>
          <div className="text-xs text-yellow-600 mt-1">On Trial</div>
        </Card>
        <Card className="text-center p-5 bg-red-50 border-red-200">
          <AlertTriangle className="w-8 h-8 mx-auto text-red-600 mb-2" />
          <div className="text-3xl font-bold text-red-700">{stats?.suspended || 0}</div>
          <div className="text-xs text-red-600 mt-1">Suspended</div>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <h3 className="font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            <Link to="/super/tenants" className="p-3 rounded-lg border hover:bg-gray-50 text-sm font-medium">Manage Schools</Link>
            <Link to="/super/plans" className="p-3 rounded-lg border hover:bg-gray-50 text-sm font-medium">Subscription Plans</Link>
            <Link to="/super/provisioning" className="p-3 rounded-lg border hover:bg-gray-50 text-sm font-medium">Provision New School</Link>
            <Link to="/audit-logs" className="p-3 rounded-lg border hover:bg-gray-50 text-sm font-medium">Audit Logs</Link>
          </div>
        </Card>
        <Card>
          <h3 className="font-semibold text-gray-900 mb-4">Schools by Plan</h3>
          <div className="space-y-2">
            {(stats?.byPlan || []).map(p => (
              <div key={p._id} className="flex justify-between text-sm">
                <span className="capitalize text-gray-600">{p._id || 'unknown'}</span>
                <span className="font-semibold">{p.count}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
