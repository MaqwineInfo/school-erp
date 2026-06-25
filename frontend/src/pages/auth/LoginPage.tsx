import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useAuthStore } from '../../stores/auth.store';
import { authService } from '../../services/auth.service';

type Portal = {
  id: string;
  label: string;
  icon: string;
  color: string;
  bg: string;
  border: string;
  desc: string;
  demoEmail: string;
  demoPassword: string;
  demoSchool: string;
};

const PORTALS: Portal[] = [
  {
    id: 'super_admin',
    label: 'Super Admin',
    icon: '🛡️',
    color: 'text-gray-900',
    bg: 'bg-gray-800',
    border: 'border-gray-700',
    desc: 'Platform-wide administration',
    demoEmail: 'admin@schoolerp.in',
    demoPassword: 'password@123',
    demoSchool: '',
  },
  {
    id: 'principal',
    label: 'Principal',
    icon: '🏫',
    color: 'text-blue-900',
    bg: 'bg-blue-600',
    border: 'border-blue-500',
    desc: 'Full school management',
    demoEmail: 'principal@sunrise.edu.in',
    demoPassword: 'password@123',
    demoSchool: 'sunrise-international',
  },
  {
    id: 'vice_principal',
    label: 'Vice Principal',
    icon: '📋',
    color: 'text-indigo-900',
    bg: 'bg-indigo-600',
    border: 'border-indigo-500',
    desc: 'Academic oversight',
    demoEmail: 'viceprincipal@sunrise.edu.in',
    demoPassword: 'password@123',
    demoSchool: 'sunrise-international',
  },
  {
    id: 'teacher',
    label: 'Teacher',
    icon: '👨‍🏫',
    color: 'text-green-900',
    bg: 'bg-green-600',
    border: 'border-green-500',
    desc: 'Classes, marks & homework',
    demoEmail: 'anand.sharma@sunrise.edu.in',
    demoPassword: 'password@123',
    demoSchool: 'sunrise-international',
  },
  {
    id: 'accountant',
    label: 'Accountant',
    icon: '💰',
    color: 'text-yellow-900',
    bg: 'bg-yellow-500',
    border: 'border-yellow-400',
    desc: 'Fees, expenses & payroll',
    demoEmail: 'accountant@sunrise.edu.in',
    demoPassword: 'password@123',
    demoSchool: 'sunrise-international',
  },
  {
    id: 'hr_manager',
    label: 'HR Manager',
    icon: '👥',
    color: 'text-orange-900',
    bg: 'bg-orange-500',
    border: 'border-orange-400',
    desc: 'Staff, leave & payroll',
    demoEmail: 'hr@sunrise.edu.in',
    demoPassword: 'password@123',
    demoSchool: 'sunrise-international',
  },
  {
    id: 'admission_officer',
    label: 'Admission Officer',
    icon: '📝',
    color: 'text-purple-900',
    bg: 'bg-purple-600',
    border: 'border-purple-500',
    desc: 'Enquiries & admissions',
    demoEmail: 'admission@sunrise.edu.in',
    demoPassword: 'password@123',
    demoSchool: 'sunrise-international',
  },
  {
    id: 'librarian',
    label: 'Librarian',
    icon: '📚',
    color: 'text-teal-900',
    bg: 'bg-teal-600',
    border: 'border-teal-500',
    desc: 'Books & library management',
    demoEmail: 'librarian@sunrise.edu.in',
    demoPassword: 'password@123',
    demoSchool: 'sunrise-international',
  },
  {
    id: 'receptionist',
    label: 'Receptionist',
    icon: '🏢',
    color: 'text-pink-900',
    bg: 'bg-pink-500',
    border: 'border-pink-400',
    desc: 'Visitors & front office',
    demoEmail: 'reception@sunrise.edu.in',
    demoPassword: 'password@123',
    demoSchool: 'sunrise-international',
  },
  {
    id: 'transport_incharge',
    label: 'Transport',
    icon: '🚌',
    color: 'text-cyan-900',
    bg: 'bg-cyan-600',
    border: 'border-cyan-500',
    desc: 'Routes & vehicles',
    demoEmail: 'transport@sunrise.edu.in',
    demoPassword: 'password@123',
    demoSchool: 'sunrise-international',
  },
  {
    id: 'hostel_warden',
    label: 'Hostel Warden',
    icon: '🏠',
    color: 'text-amber-900',
    bg: 'bg-amber-600',
    border: 'border-amber-500',
    desc: 'Hostel & room management',
    demoEmail: 'hostel@sunrise.edu.in',
    demoPassword: 'password@123',
    demoSchool: 'sunrise-international',
  },
  {
    id: 'cashier',
    label: 'Cashier',
    icon: '💵',
    color: 'text-amber-900',
    bg: 'bg-amber-500',
    border: 'border-amber-400',
    desc: 'Fee collection counter',
    demoEmail: 'cashier@sunrise.edu.in',
    demoPassword: 'password@123',
    demoSchool: 'sunrise-international',
  },
  {
    id: 'driver',
    label: 'Driver',
    icon: '🚗',
    color: 'text-stone-900',
    bg: 'bg-stone-600',
    border: 'border-stone-500',
    desc: 'Route & student attendance',
    demoEmail: 'driver@sunrise.edu.in',
    demoPassword: 'password@123',
    demoSchool: 'sunrise-international',
  },
  {
    id: 'parent',
    label: 'Parent',
    icon: '👨‍👩‍👧',
    color: 'text-rose-900',
    bg: 'bg-rose-500',
    border: 'border-rose-400',
    desc: 'Child progress & fees',
    demoEmail: 'parent1@sunrise.edu.in',
    demoPassword: 'password@123',
    demoSchool: 'sunrise-international',
  },
  {
    id: 'student',
    label: 'Student',
    icon: '🎒',
    color: 'text-lime-900',
    bg: 'bg-lime-600',
    border: 'border-lime-500',
    desc: 'Homework, exams & timetable',
    demoEmail: 'student1@sunrise.edu.in',
    demoPassword: 'password@123',
    demoSchool: 'sunrise-international',
  },
];

export default function LoginPage() {
  const [selectedPortal, setSelectedPortal] = useState<Portal | null>(null);
  const [form, setForm] = useState({ email: '', password: '', tenantSlug: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const selectPortal = (portal: Portal) => {
    setSelectedPortal(portal);
    setForm({ email: portal.demoEmail, password: portal.demoPassword, tenantSlug: portal.demoSchool });
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await authService.login(form.email, form.password, form.tenantSlug || undefined);
      const { token, user, permissionMap, enabledModules } = res.data;
      const { setAuth } = useAuthStore.getState();
      setAuth(token, user, permissionMap || {}, enabledModules || []);
      navigate('/');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Login failed. Check credentials.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-900 flex flex-col">
      {/* Header */}
      <div className="text-center pt-10 pb-6">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-white/10 rounded-2xl mb-3 text-4xl">🏫</div>
        <h1 className="text-3xl font-bold text-white">School ERP</h1>
        <p className="text-blue-300 text-sm mt-1">Multi-Role School Management System</p>
      </div>

      {!selectedPortal ? (
        /* Portal Selection Grid */
        <div className="flex-1 px-6 pb-10 max-w-5xl mx-auto w-full">
          <p className="text-center text-blue-200 text-sm mb-6">Select your login portal to continue</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {PORTALS.map(portal => (
              <button
                key={portal.id}
                onClick={() => selectPortal(portal)}
                className="bg-white/10 hover:bg-white/20 border border-white/20 rounded-2xl p-4 text-left transition-all hover:scale-105 hover:shadow-lg group"
              >
                <div className="text-3xl mb-2">{portal.icon}</div>
                <div className="text-white font-semibold text-sm">{portal.label}</div>
                <div className="text-blue-300 text-xs mt-0.5">{portal.desc}</div>
              </button>
            ))}
          </div>

          {/* All credentials reference */}
          <div className="mt-8 bg-white/5 border border-white/10 rounded-2xl p-5">
            <p className="text-white font-semibold text-sm mb-3">📋 All Demo Credentials — Password: <code className="text-yellow-300">password@123</code> | School Code: <code className="text-yellow-300">sunrise-international</code></p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-1 text-xs text-blue-200">
              {PORTALS.filter(p => p.demoEmail).map(p => (
                <div key={p.id}>
                  <span className="text-white font-medium">{p.icon} {p.label}:</span>{' '}
                  <code className="text-yellow-200">{p.demoEmail}</code>
                </div>
              ))}
              <div>
                <span className="text-white font-medium">👨‍👩‍👧 Parent 2:</span>{' '}
                <code className="text-yellow-200">parent2@sunrise.edu.in</code>
              </div>
              <div>
                <span className="text-white font-medium">🎒 Student 2:</span>{' '}
                <code className="text-yellow-200">student2@sunrise.edu.in</code>
              </div>
              <div>
                <span className="text-white font-medium">🎒 Student 3:</span>{' '}
                <code className="text-yellow-200">student3@sunrise.edu.in</code>
              </div>
            </div>
          </div>

          <p className="text-center text-blue-300 text-xs mt-5 cursor-pointer hover:text-white" onClick={() => window.location.href = '/onboarding'}>
            New school? Start Onboarding →
          </p>
        </div>
      ) : (
        /* Login Form */
        <div className="flex-1 flex items-start justify-center px-4 pb-10">
          <div className="w-full max-w-md">
            {/* Portal Badge */}
            <div className={`${selectedPortal.bg} rounded-2xl p-4 mb-4 flex items-center gap-3`}>
              <div className="text-4xl">{selectedPortal.icon}</div>
              <div>
                <div className="text-white font-bold text-lg">{selectedPortal.label} Portal</div>
                <div className="text-white/70 text-sm">{selectedPortal.desc}</div>
              </div>
              <button onClick={() => setSelectedPortal(null)} className="ml-auto text-white/60 hover:text-white text-sm bg-white/10 px-3 py-1 rounded-lg">← Back</button>
            </div>

            <div className="bg-white rounded-2xl shadow-2xl p-7">
              <h2 className="text-lg font-semibold text-gray-900 mb-5">Sign in to your account</h2>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{error}</div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">School Code</label>
                  <input
                    type="text"
                    placeholder="e.g. sunrise-international"
                    value={form.tenantSlug}
                    onChange={e => setForm(f => ({ ...f, tenantSlug: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email address</label>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                  <div className="relative">
                    <input
                      type={showPass ? 'text' : 'password'}
                      required
                      value={form.password}
                      onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                      className="w-full px-3 py-2.5 pr-10 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" onClick={() => setShowPass(!showPass)}>
                      {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full py-3 ${selectedPortal.bg} hover:opacity-90 disabled:opacity-50 text-white font-semibold rounded-lg transition-all text-sm`}
                >
                  {loading ? 'Signing in...' : `Sign in as ${selectedPortal.label}`}
                </button>
              </form>

              {/* Pre-filled demo hint */}
              <div className="mt-4 p-3 bg-blue-50 rounded-lg text-xs text-blue-700">
                <span className="font-semibold">Demo pre-filled:</span> {selectedPortal.demoEmail} / {selectedPortal.demoPassword}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
