import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from '../../lib/api';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { SUPER_ADMIN_MODULES } from '../../constants/modules';

type Tenant = { _id: string; name: string; planName: string; enabledModules: string[] };

export default function TenantModulesPage() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const qc = useQueryClient();
  const [selected, setSelected] = useState<string[]>([]);

  const { data: tenant, isLoading } = useQuery<Tenant>({
    queryKey: ['tenant', tenantId],
    queryFn: () => axios.get(`/plans/tenants/${tenantId}`).then(r => {
      const t = r.data.data;
      setSelected(t.enabledModules || []);
      return t;
    }),
    enabled: !!tenantId,
  });

  const save = useMutation({
    mutationFn: () => axios.patch(`/plans/tenants/${tenantId}/modules`, { enabledModules: selected }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tenant', tenantId] }),
  });

  const toggle = (mod: string) => {
    setSelected(prev => prev.includes(mod) ? prev.filter(m => m !== mod) : [...prev, mod]);
  };

  if (isLoading) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title={`Module Management — ${tenant?.name}`}
        description="Enable or disable modules per school (Plan §8 step 4, WF-0025)"
        breadcrumb={[{ label: 'Super Admin' }, { label: 'Schools', href: '/super/tenants' }, { label: tenant?.name || '' }]}
        actions={<Button loading={save.isPending} onClick={() => save.mutate()}>Save Modules</Button>}
      />

      <Card>
        <p className="text-sm text-gray-600 mb-4">Plan: <strong className="capitalize">{tenant?.planName}</strong></p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {SUPER_ADMIN_MODULES.map(mod => (
            <label key={mod} className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
              <input type="checkbox" checked={selected.includes(mod)} onChange={() => toggle(mod)} className="rounded border-gray-300" />
              <span className="text-sm capitalize">{mod.replace(/_/g, ' ')}</span>
            </label>
          ))}
        </div>
      </Card>

      <Link to="/super/tenants" className="text-sm text-blue-600">← Back to schools</Link>
    </div>
  );
}
