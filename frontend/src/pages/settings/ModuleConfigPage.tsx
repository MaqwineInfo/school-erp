import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from '../../lib/api';
import { SCHOOL_MODULES } from '../../constants/modules';

export default function ModuleConfigPage() {
  const qc = useQueryClient();

  const { data: tenant } = useQuery({
    queryKey: ['school-profile'],
    queryFn: () => axios.get('/settings/profile').then(r => r.data.data),
  });

  const [selected, setSelected] = useState<string[]>([]);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (tenant?.enabledModules) setSelected(tenant.enabledModules);
    else if (tenant) setSelected(SCHOOL_MODULES.map(m => m.slug));
  }, [tenant]);

  const update = useMutation({
    mutationFn: (modules: string[]) => axios.put('/settings/modules', { enabledModules: modules }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['school-profile'] }); setDirty(false); },
  });

  const toggle = (slug: string) => {
    setSelected(prev => prev.includes(slug) ? prev.filter(s => s !== slug) : [...prev, slug]);
    setDirty(true);
  };

  return (
    <div className="p-6 max-w-4xl space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Module Configuration</h1>
          <p className="text-sm text-gray-500">Enable modules aligned with your subscription plan (Plan §8 step 4)</p>
        </div>
        {dirty && (
          <button onClick={() => update.mutate(selected)} disabled={update.isPending} className="btn-primary">
            {update.isPending ? 'Saving...' : 'Save Configuration'}
          </button>
        )}
      </div>

      {update.isSuccess && <div className="bg-green-50 text-green-700 px-4 py-2 rounded-lg text-sm">Module configuration updated.</div>}

      <div className="grid grid-cols-2 gap-4">
        {SCHOOL_MODULES.map(m => {
          const isEnabled = selected.includes(m.slug);
          return (
            <div key={m.slug} onClick={() => toggle(m.slug)}
              className={`card p-4 cursor-pointer transition-all ${isEnabled ? 'border-2 border-blue-400 bg-blue-50/30' : 'opacity-60 hover:opacity-80'}`}>
              <div className="font-semibold text-sm">{m.label}</div>
              <div className="text-xs text-gray-500 mt-1">{m.desc}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
