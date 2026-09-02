import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery } from '@tanstack/react-query';
import axios from '../../lib/api';

// ─── Types ───────────────────────────────────────────────────────────────────
type WizardState = {
  tenantId?: string;
  slug?: string;
  onboardingId?: string;
  currentStep: number;
};

type Plan = {
  _id: string;
  name: string;
  displayName: string;
  description: string;
  pricePerStudentPerYear: number;
  maxStudents: number;
  includedModules: string[];
  features: Record<string, unknown>;
};

const STEPS = [
  { label: 'School Profile', icon: '🏫' },
  { label: 'Plan & Modules', icon: '📦' },
  { label: 'Academic Setup', icon: '📚' },
  { label: 'Admin User', icon: '👤' },
  { label: 'Fee Settings', icon: '💰' },
  { label: 'Import Students', icon: '📥' },
  { label: 'Payment Gateway', icon: '💳' },
  { label: 'SMS & WhatsApp', icon: '💬' },
];

const MODULE_LABELS: Record<string, string> = {
  admissions: 'Admissions', students: 'Students', academics: 'Academics',
  attendance: 'Attendance', fees: 'Fee Management', exams: 'Exams & Results',
  homework: 'Homework', study_material: 'Study Material', communication: 'Communication',
  transport: 'Transport', hostel: 'Hostel', library: 'Library',
  hr: 'HR Management', payroll: 'Payroll', discipline: 'Discipline',
  health: 'Health & Medical', events: 'Events', inventory: 'Inventory',
  expense: 'Expense', visitors: 'Visitors', certificates: 'Certificates',
  alumni: 'Alumni', reports: 'Reports', website_builder: 'Website Builder',
  multi_branch: 'Multi-Branch', white_label: 'White Label', ai_features: 'AI Features',
  mobile_app: 'Mobile App', api_access: 'API Access',
};

// ─── Step Progress Bar ────────────────────────────────────────────────────────
function StepProgress({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center justify-between mb-8">
      {STEPS.map((s, i) => (
        <React.Fragment key={i}>
          <div className="flex flex-col items-center">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-semibold transition-all ${
              i + 1 < current ? 'bg-green-500 text-white' :
              i + 1 === current ? 'bg-blue-600 text-white ring-4 ring-blue-100' :
              'bg-gray-200 text-gray-400'
            }`}>
              {i + 1 < current ? '✓' : s.icon}
            </div>
            <span className={`text-xs mt-1 font-medium hidden md:block ${i + 1 === current ? 'text-blue-600' : 'text-gray-400'}`}>
              {s.label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div className={`flex-1 h-0.5 mx-1 ${i + 1 < current ? 'bg-green-500' : 'bg-gray-200'}`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

// ─── Step 1: School Profile ───────────────────────────────────────────────────
function Step1Profile({ onNext }: { onNext: (data: Record<string, unknown>, result: { tenantId: string; slug: string }) => void }) {
  const { register, handleSubmit, formState: { errors } } = useForm();
  const mutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => axios.post('/onboarding/start', data).then(r => r.data.data),
    onSuccess: (result, vars) => onNext(vars as Record<string, unknown>, result),
  });

  return (
    <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">School Name *</label>
          <input {...register('name', { required: 'Required' })} placeholder="e.g. Sunrise International School" className="input-field" />
          {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message as string}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Board *</label>
          <select {...register('board', { required: true })} className="input-field">
            <option value="CBSE">CBSE</option>
            <option value="ICSE">ICSE</option>
            <option value="IB">IB</option>
            <option value="CAMBRIDGE">Cambridge</option>
            <option value="STATE_GSEB">GSEB (Gujarat)</option>
            <option value="STATE_MAHA">SSC/HSC (Maharashtra)</option>
            <option value="STATE_TN">Tamil Nadu State Board</option>
            <option value="OTHER">Other State Board</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Management Type</label>
          <select {...register('managementType')} className="input-field">
            <option value="private">Private Unaided</option>
            <option value="aided">Private Aided</option>
            <option value="govt">Government</option>
            <option value="international">International</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Official Email *</label>
          <input {...register('email', { required: 'Required' })} type="email" placeholder="info@school.edu.in" className="input-field" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
          <input {...register('phone')} placeholder="+91-79-XXXXXXXX" className="input-field" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Affiliation No. (CBSE/ICSE)</label>
          <input {...register('affNo')} placeholder="e.g. 430003045" className="input-field" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">UDISE Code</label>
          <input {...register('udiseCode')} placeholder="24-digit UDISE code" className="input-field" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">GSTIN</label>
          <input {...register('gstin')} placeholder="22AAAAA0000A1Z5" className="input-field" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Year Established</label>
          <input {...register('established')} type="number" placeholder="2005" className="input-field" />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
          <input {...register('address')} placeholder="Street, Locality" className="input-field" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">City *</label>
          <input {...register('city', { required: 'Required' })} placeholder="Ahmedabad" className="input-field" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
          <select {...register('state')} className="input-field">
            {['Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh','Uttarakhand','West Bengal','Delhi','J&K','Ladakh','Puducherry'].map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">PIN Code</label>
          <input {...register('pinCode')} placeholder="380058" className="input-field" />
        </div>
      </div>

      {mutation.isError && (
        <div className="bg-red-50 text-red-700 rounded-lg p-3 text-sm">
          {(mutation.error as { message?: string })?.message || 'Something went wrong'}
        </div>
      )}

      <button type="submit" disabled={mutation.isPending} className="btn-primary w-full mt-4">
        {mutation.isPending ? 'Saving...' : 'Continue →'}
      </button>
    </form>
  );
}

// ─── Step 2: Plan Selection ───────────────────────────────────────────────────
function Step2Plan({ tenantId, onNext }: { tenantId: string; onNext: () => void }) {
  const { data: plans = [] } = useQuery<Plan[]>({
    queryKey: ['plans-public'],
    queryFn: () => axios.get('/plans/public').then(r => r.data.data),
  });

  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [enabledModules, setEnabledModules] = useState<string[]>([]);

  const mutation = useMutation({
    mutationFn: () => axios.post('/onboarding/plan', { tenantId, planId: selectedPlan?._id, enabledModules }).then(r => r.data),
    onSuccess: onNext,
  });

  const handlePlanSelect = (plan: Plan) => {
    setSelectedPlan(plan);
    setEnabledModules([...plan.includedModules]);
  };

  const toggleModule = (mod: string) => {
    setEnabledModules(prev => prev.includes(mod) ? prev.filter(m => m !== mod) : [...prev, mod]);
  };

  const planColors: Record<string, string> = { starter: 'blue', growth: 'purple', enterprise: 'amber' };
  const planColorClasses: Record<string, string> = {
    starter: 'border-blue-500 bg-blue-50',
    growth: 'border-purple-500 bg-purple-50',
    enterprise: 'border-amber-500 bg-amber-50',
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {plans.map(plan => (
          <button key={plan._id} onClick={() => handlePlanSelect(plan)}
            className={`border-2 rounded-xl p-4 text-left transition-all ${selectedPlan?._id === plan._id ? planColorClasses[plan.name] || 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
            <div className="font-bold text-lg">{plan.displayName}</div>
            <div className="text-sm text-gray-500 mt-1">{plan.description}</div>
            <div className="mt-3">
              <span className="text-2xl font-bold">₹{plan.pricePerStudentPerYear}</span>
              <span className="text-xs text-gray-500">/student/year</span>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Up to {plan.maxStudents > 0 ? plan.maxStudents : 'unlimited'} students
            </div>
            <div className="mt-2 text-xs text-gray-600">
              {plan.includedModules.length} modules included
            </div>
          </button>
        ))}
      </div>

      {selectedPlan && (
        <div className="border rounded-xl p-4">
          <h3 className="font-semibold text-gray-800 mb-3">Enable/Disable Modules for This School</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {selectedPlan.includedModules.map(mod => (
              <label key={mod} className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={enabledModules.includes(mod)} onChange={() => toggleModule(mod)}
                  className="rounded text-blue-600" />
                <span className="text-sm">{MODULE_LABELS[mod] || mod}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      <button onClick={() => mutation.mutate()} disabled={!selectedPlan || mutation.isPending} className="btn-primary w-full">
        {mutation.isPending ? 'Saving...' : 'Continue →'}
      </button>
    </div>
  );
}

// ─── Step 3: Academic Setup ───────────────────────────────────────────────────
function Step3Academic({ tenantId, onNext }: { tenantId: string; onNext: () => void }) {
  const { register, handleSubmit } = useForm({
    defaultValues: {
      academicYearName: '2026-27',
      startDate: '2026-04-01',
      endDate: '2027-03-31',
      startMonth: 'april',
    },
  });

  const [standards, setStandards] = useState([
    { name: 'Nursery', shortName: 'Nurs', divisions: 'A, B', stage: 'pre_primary' },
    { name: 'LKG', shortName: 'LKG', divisions: 'A, B', stage: 'pre_primary' },
    { name: 'UKG', shortName: 'UKG', divisions: 'A, B', stage: 'pre_primary' },
    ...Array.from({ length: 10 }, (_, i) => ({ name: `Class ${i + 1}`, shortName: `${i + 1}`, divisions: 'A, B, C', stage: i < 4 ? 'primary' : i < 7 ? 'middle' : 'secondary' })),
    { name: 'Class 11', shortName: '11', divisions: 'A, B', stage: 'senior_secondary' },
    { name: 'Class 12', shortName: '12', divisions: 'A, B', stage: 'senior_secondary' },
  ]);

  const mutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => axios.post('/onboarding/academic', {
      tenantId, ...data,
      standards: standards.map(s => ({ ...s, divisions: s.divisions.split(',').map(d => d.trim()).filter(Boolean) })),
    }).then(r => r.data),
    onSuccess: onNext,
  });

  return (
    <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Academic Year Name</label>
          <input {...register('academicYearName')} className="input-field" placeholder="2026-27" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
          <input {...register('startDate')} type="date" className="input-field" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
          <input {...register('endDate')} type="date" className="input-field" />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-gray-800">Classes / Standards</h3>
          <button type="button" onClick={() => setStandards(s => [...s, { name: '', shortName: '', divisions: 'A', stage: 'primary' }])}
            className="text-sm text-blue-600 hover:underline">+ Add Class</button>
        </div>
        <div className="border rounded-lg divide-y">
          {standards.map((s, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 p-2 items-center">
              <input value={s.name} onChange={e => setStandards(prev => { const a = [...prev]; a[i] = { ...a[i], name: e.target.value }; return a; })}
                placeholder="Class 1" className="col-span-3 input-field text-sm py-1" />
              <input value={s.shortName} onChange={e => setStandards(prev => { const a = [...prev]; a[i] = { ...a[i], shortName: e.target.value }; return a; })}
                placeholder="1" className="col-span-1 input-field text-sm py-1" />
              <select value={s.stage} onChange={e => setStandards(prev => { const a = [...prev]; a[i] = { ...a[i], stage: e.target.value }; return a; })}
                className="col-span-3 input-field text-sm py-1">
                <option value="pre_primary">Pre-Primary</option>
                <option value="primary">Primary</option>
                <option value="middle">Middle</option>
                <option value="secondary">Secondary</option>
                <option value="senior_secondary">Sr. Secondary</option>
              </select>
              <div className="col-span-4 flex gap-1">
                <input value={s.divisions} onChange={e => setStandards(prev => { const a = [...prev]; a[i] = { ...a[i], divisions: e.target.value }; return a; })}
                  placeholder="A, B, C" className="flex-1 input-field text-sm py-1" />
                <button type="button" onClick={() => setStandards(prev => prev.filter((_, j) => j !== i))}
                  className="text-red-400 hover:text-red-600 px-1">✕</button>
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-1">Divisions: comma-separated (e.g. "A, B, C")</p>
      </div>

      <button type="submit" disabled={mutation.isPending} className="btn-primary w-full">
        {mutation.isPending ? 'Creating...' : 'Continue →'}
      </button>
    </form>
  );
}

// ─── Step 4: Admin User ───────────────────────────────────────────────────────
function Step4AdminUser({ tenantId, onNext, onToken }: { tenantId: string; onNext: () => void; onToken: (t: string) => void }) {
  const { register, handleSubmit, formState: { errors } } = useForm();

  const mutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => axios.post('/onboarding/admin-user', { tenantId, ...data }).then(r => r.data.data),
    onSuccess: (data) => { onToken(data.token); onNext(); },
  });

  return (
    <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
        This creates the principal / admin account. You'll use this to log in after setup.
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
          <input {...register('name', { required: 'Required' })} placeholder="Dr. Sunita Patel" className="input-field" />
          {errors.name && <p className="text-red-500 text-xs">{errors.name.message as string}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Designation</label>
          <input {...register('designation')} placeholder="Principal" className="input-field" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
          <input {...register('email', { required: 'Required' })} type="email" placeholder="principal@school.edu.in" className="input-field" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
          <input {...register('phone')} placeholder="+91 98765 43210" className="input-field" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
          <input {...register('password', { required: 'Required', minLength: { value: 8, message: 'Min 8 characters' } })} type="password" className="input-field" />
          {errors.password && <p className="text-red-500 text-xs">{errors.password.message as string}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password *</label>
          <input {...register('confirmPassword', { required: 'Required' })} type="password" className="input-field" />
        </div>
      </div>

      {mutation.isError && <div className="bg-red-50 text-red-700 rounded-lg p-3 text-sm">{(mutation.error as { message?: string })?.message}</div>}

      <button type="submit" disabled={mutation.isPending} className="btn-primary w-full">
        {mutation.isPending ? 'Creating...' : 'Create Admin Account →'}
      </button>
    </form>
  );
}

// ─── Step 5: Fee Setup ────────────────────────────────────────────────────────
function Step5FeeSetup({ tenantId, onNext }: { tenantId: string; onNext: () => void }) {
  const { register, handleSubmit } = useForm({ defaultValues: { gstEnabled: false, lateFeeEnabled: true } });
  const [paymentModes, setPaymentModes] = useState<Record<string, boolean>>({});

  const mutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => axios.post('/onboarding/fee-setup', { tenantId, ...data, paymentModes }).then(r => r.data),
    onSuccess: onNext,
  });

  return (
    <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="border rounded-xl p-4">
          <h3 className="font-semibold text-gray-800 mb-3">Tax Settings</h3>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" {...register('gstEnabled')} className="rounded w-4 h-4" />
            <div>
              <div className="font-medium text-sm">Enable GST on Fees</div>
              <div className="text-xs text-gray-500">School under GST registration (18% on taxable components)</div>
            </div>
          </label>
        </div>
        <div className="border rounded-xl p-4">
          <h3 className="font-semibold text-gray-800 mb-3">Late Fee Settings</h3>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" {...register('lateFeeEnabled')} className="rounded w-4 h-4" />
            <div>
              <div className="font-medium text-sm">Enable Late Fee Penalty</div>
              <div className="text-xs text-gray-500">Auto-charge ₹50/day after due date (configurable per structure)</div>
            </div>
          </label>
        </div>
      </div>

      <div>
        <h3 className="font-semibold text-gray-800 mb-3">Accepted Payment Modes</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[['cash', '💵 Cash'], ['cheque', '🏦 Cheque'], ['neft_rtgs', '🔄 NEFT/RTGS'], ['upi', '📱 UPI'], ['dd', '📜 DD'], ['pos', '💳 POS/Card'], ['online', '🌐 Online Portal'], ['razorpay', '⚡ Razorpay']].map(([v, l]) => (
            <label key={v} className="flex items-center gap-2 cursor-pointer border rounded-lg p-2">
              <input
                type="checkbox"
                checked={!!paymentModes[v]}
                onChange={(e) => setPaymentModes((prev) => ({ ...prev, [v]: e.target.checked }))}
                className="rounded"
              />
              <span className="text-sm">{l}</span>
            </label>
          ))}
        </div>
      </div>

      <button type="submit" disabled={mutation.isPending} className="btn-primary w-full">
        {mutation.isPending ? 'Saving...' : 'Continue →'}
      </button>
    </form>
  );
}

// ─── Steps 6-8: Skip for now (simplified) ────────────────────────────────────
function SkipStep({ tenantId, step, label, onNext }: { tenantId: string; step: string; label: string; onNext: () => void }) {
  const mutation = useMutation({
    mutationFn: () => axios.post(`/onboarding/${step}`, { tenantId }).then(r => r.data),
    onSuccess: onNext,
  });

  return (
    <div className="text-center py-8 space-y-4">
      <div className="text-4xl mb-2">⚙️</div>
      <p className="text-gray-600">{label}</p>
      <p className="text-sm text-gray-500">You can configure this after setup from the admin panel.</p>
      <div className="flex gap-3 justify-center">
        <button onClick={() => mutation.mutate()} disabled={mutation.isPending} className="btn-secondary">
          {mutation.isPending ? 'Skipping...' : 'Skip for Now'}
        </button>
        <button onClick={onNext} className="btn-primary">Configure Now →</button>
      </div>
    </div>
  );
}

// ─── Main Wizard ──────────────────────────────────────────────────────────────
export default function OnboardingWizard() {
  const navigate = useNavigate();
  const [state, setState] = useState<WizardState>({ currentStep: 1 });
  const [token, setToken] = useState<string>('');

  const next = () => setState(s => ({ ...s, currentStep: s.currentStep + 1 }));

  const handleComplete = () => {
    if (token) {
      localStorage.setItem('token', token);
      navigate('/');
    } else {
      navigate('/login');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 text-white">
          <h1 className="text-2xl font-bold">School ERP Setup Wizard</h1>
          <p className="text-blue-200 text-sm mt-1">Let's set up your school in 8 easy steps</p>
        </div>

        <div className="p-6">
          <StepProgress current={state.currentStep} total={8} />

          <div className="mb-4">
            <h2 className="text-xl font-semibold text-gray-800">
              Step {state.currentStep}: {STEPS[state.currentStep - 1]?.label}
            </h2>
          </div>

          {state.currentStep === 1 && (
            <Step1Profile onNext={(_, result) => setState(s => ({ ...s, ...result, currentStep: 2 }))} />
          )}
          {state.currentStep === 2 && state.tenantId && (
            <Step2Plan tenantId={state.tenantId} onNext={next} />
          )}
          {state.currentStep === 3 && state.tenantId && (
            <Step3Academic tenantId={state.tenantId} onNext={next} />
          )}
          {state.currentStep === 4 && state.tenantId && (
            <Step4AdminUser tenantId={state.tenantId} onNext={next} onToken={setToken} />
          )}
          {state.currentStep === 5 && state.tenantId && (
            <Step5FeeSetup tenantId={state.tenantId} onNext={next} />
          )}
          {state.currentStep === 6 && (
            <SkipStep tenantId={state.tenantId!} step="import-students" label="Import your existing students from an Excel file (optional)." onNext={next} />
          )}
          {state.currentStep === 7 && (
            <SkipStep tenantId={state.tenantId!} step="payment-gateway" label="Configure online payment gateway (Razorpay/Cashfree) for online fee collection." onNext={next} />
          )}
          {state.currentStep === 8 && (
            <SkipStep tenantId={state.tenantId!} step="sms-setup" label="Configure SMS & WhatsApp for automated parent notifications." onNext={handleComplete} />
          )}
        </div>
      </div>
    </div>
  );
}
