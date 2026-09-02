import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Copy, ExternalLink } from 'lucide-react';
import { useAuthStore } from '../../stores/auth.store';
import { authService } from '../../services/auth.service';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';

export default function AdmissionFormPage() {
  const { user, updateUser, setEnabledModules } = useAuthStore();

  const { data } = useQuery({
    queryKey: ['auth-me'],
    queryFn: authService.me,
  });

  useEffect(() => {
    if (data?.data) {
      const me = data.data as {
        isSuperAdmin?: boolean;
        role?: string;
        enabledModules?: string[];
        tenant?: { slug?: string; name?: string };
        tenantId?: { slug?: string; name?: string } | string;
      };
      updateUser({
        isSuperAdmin: !!me.isSuperAdmin,
        role: me.role as never,
      });
      if (me.enabledModules) setEnabledModules(me.enabledModules);
    }
  }, [data, updateUser, setEnabledModules]);

  const tenantSlug =
    (typeof user?.tenantId === 'object' && user.tenantId && 'slug' in user.tenantId
      ? (user.tenantId as { slug?: string }).slug
      : undefined) ||
    (data?.data as { tenant?: { slug?: string } })?.tenant?.slug ||
    (data?.data as { tenantId?: { slug?: string } })?.tenantId?.slug;

  const publicUrl = tenantSlug ? `${window.location.origin}/apply/${tenantSlug}` : null;

  const copyLink = () => {
    if (publicUrl) navigator.clipboard.writeText(publicUrl);
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <PageHeader
        title="Online Admission"
        description="Share the public form link with parents — no login required"
        breadcrumb={[{ label: 'Home' }, { label: 'Admissions' }, { label: 'Online Admission' }]}
      />

      <div className="card p-6 space-y-4">
        <p className="text-sm text-gray-600">
          Parents use this link to submit enquiries with <strong>class and section</strong> selected upfront.
          Submissions appear in <Link to="/admissions/enquiries" className="text-blue-600 underline">Admission Enquiries</Link>.
        </p>

        {publicUrl ? (
          <>
            <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl">
              <p className="text-xs font-semibold text-blue-800 uppercase mb-2">Public admission URL</p>
              <code className="text-sm text-blue-900 break-all">{publicUrl}</code>
            </div>
            <div className="flex gap-3 flex-wrap">
              <Button icon={<Copy className="w-4 h-4" />} variant="outline" onClick={copyLink}>Copy Link</Button>
              <a href={publicUrl} target="_blank" rel="noreferrer">
                <Button icon={<ExternalLink className="w-4 h-4" />}>Open Form</Button>
              </a>
            </div>
          </>
        ) : (
          <p className="text-sm text-amber-700 bg-amber-50 p-4 rounded-lg">
            School slug not found. Complete school profile setup first.
          </p>
        )}
      </div>
    </div>
  );
}
