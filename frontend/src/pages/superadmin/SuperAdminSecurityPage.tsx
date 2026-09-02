import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';

export default function SuperAdminSecurityPage() {
  return (
    <div className="p-6 space-y-6">
      <PageHeader title="Security Center" description="Platform security overview (WF-0029)" breadcrumb={[{ label: 'Super Admin' }, { label: 'Security' }]} />
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="p-5">
          <h3 className="font-semibold mb-2">Authentication</h3>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>JWT with DB-hydrated super admin flags</li>
            <li>RBAC enforced on all module routes</li>
            <li>Audit logs for sensitive actions</li>
          </ul>
        </Card>
        <Card className="p-5">
          <h3 className="font-semibold mb-2">Recommendations</h3>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>Enable MFA for super admin accounts</li>
            <li>Rotate JWT secret periodically</li>
            <li>Review audit logs weekly</li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
