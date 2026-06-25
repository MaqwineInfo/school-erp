import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from '../../lib/api';

const ALL_MODULES = [
  { slug: 'admissions', label: '📋 Admissions', desc: 'Enquiries, online form, RTE tracking' },
  { slug: 'students', label: '👥 Students', desc: 'Student database, 360° profile, ID cards' },
  { slug: 'academics', label: '📚 Academics', desc: 'Standards, subjects, timetable, syllabus' },
  { slug: 'attendance', label: '📅 Attendance', desc: 'Daily, period-wise, biometric' },
  { slug: 'homework', label: '📝 Homework', desc: 'Classwork, homework, assignments, projects' },
  { slug: 'exams', label: '📊 Exams & Marks', desc: 'Exam schedule, marks entry, report cards' },
  { slug: 'fees', label: '💰 Fees', desc: 'Fee structures, demands, collection, concessions' },
  { slug: 'hr', label: '👨‍💼 HR & Staff', desc: 'Staff profiles, leave, payroll, salary slips' },
  { slug: 'library', label: '📖 Library', desc: 'Books catalog, issue, return, fines' },
  { slug: 'transport', label: '🚌 Transport', desc: 'Routes, vehicles, student allocation' },
  { slug: 'hostel', label: '🏠 Hostel', desc: 'Rooms, allocation, warden management' },
  { slug: 'communication', label: '📢 Communication', desc: 'Notices, SMS, WhatsApp, email' },
  { slug: 'finance', label: '💼 Finance', desc: 'Expenses, vouchers, budget' },
  { slug: 'frontoffice', label: '🏫 Front Office', desc: 'Visitors, gate pass, certificates' },
  { slug: 'events', label: '🎉 Events', desc: 'Academic calendar, events, holidays' },
  { slug: 'health', label: '🏥 Health', desc: 'Health records, checkups, vaccinations' },
  { slug: 'inventory', label: '📦 Inventory', desc: 'Assets, equipment, consumables' },
  { slug: 'reports', label: '📈 Reports', desc: 'All module reports and analytics' },
];

export default function ModuleConfigPage() {
  const qc = useQueryClient();

  const { data: tenant } = useQuery({
    queryKey: ['school-profile'],
    queryFn: () => axios.get('/settings/profile').then(r => r.data.data),
  });

  const enabledModules: string[] = tenant?.enabledModules || ALL_MODULES.map(m => m.slug);
  const [selected, setSelected] = useState<string[]>(enabledModules);
  const [dirty, setDirty] = useState(false);

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
          <p className="text-sm text-gray-500">Enable or disable modules for this school. Changes take effect immediately for all users.</p>
        </div>
        {dirty && (
          <button onClick={() => update.mutate(selected)} disabled={update.isPending} className="btn-primary">
            {update.isPending ? 'Saving...' : '💾 Save Configuration'}
          </button>
        )}
      </div>

      {update.isSuccess && <div className="bg-green-50 text-green-700 px-4 py-2 rounded-lg text-sm">✅ Module configuration updated successfully.</div>}

      <div className="grid grid-cols-2 gap-4">
        {ALL_MODULES.map(m => {
          const isEnabled = selected.includes(m.slug);
          return (
            <div
              key={m.slug}
              onClick={() => toggle(m.slug)}
              className={`card p-4 cursor-pointer transition-all ${isEnabled ? 'border-2 border-blue-400 bg-blue-50/30' : 'opacity-60 hover:opacity-80'}`}
            >
              <div className="flex items-start gap-3">
                <div className={`mt-1 w-5 h-5 rounded flex items-center justify-center flex-shrink-0 ${isEnabled ? 'bg-blue-600' : 'border-2 border-gray-300'}`}>
                  {isEnabled && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                </div>
                <div>
                  <div className="font-semibold text-sm text-gray-900">{m.label}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{m.desc}</div>
                </div>
                <div className="ml-auto">
                  <span className={`badge ${isEnabled ? 'badge-green' : 'badge-gray'}`}>{isEnabled ? 'Active' : 'Disabled'}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="text-sm text-gray-500">
        <strong>{selected.length}</strong> of {ALL_MODULES.length} modules enabled.
        Disabled modules are hidden from the sidebar for all users.
      </div>
    </div>
  );
}
