import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ClassDivisionPicker } from '../../components/academics/ClassDivisionPicker';
import { formatClassSection } from '../../constants/systemFlow';
import { publicAdmissionService } from '../../services/publicAdmission.service';

const STEPS = ['Student Details', 'Parent / Guardian', 'Address', 'Previous School', 'Review & Submit'];

export default function PublicAdmissionPage() {
  const { slug = '' } = useParams<{ slug: string }>();
  const [step, setStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [standardId, setStandardId] = useState('');
  const [divisionName, setDivisionName] = useState('');
  const [submitError, setSubmitError] = useState('');
  const navigate = useNavigate();
  const { register, handleSubmit, getValues } = useForm();

  const { data: schoolRes, isLoading: loadingSchool, error: schoolError } = useQuery({
    queryKey: ['public-school', slug],
    queryFn: () => publicAdmissionService.getSchool(slug),
    enabled: !!slug,
  });

  const { data: classesRes, isLoading: loadingClasses } = useQuery({
    queryKey: ['public-classes', slug],
    queryFn: () => publicAdmissionService.getClasses(slug),
    enabled: !!slug,
  });

  const school = schoolRes?.data;
  const classes = classesRes?.data || [];

  const save = useMutation({
    mutationFn: (d: Record<string, unknown>) => publicAdmissionService.submit(slug, d),
    onSuccess: () => setSubmitted(true),
    onError: (err: { response?: { data?: { message?: string } } }) => {
      setSubmitError(err.response?.data?.message || 'Failed to submit application');
    },
  });

  const onSubmit = (data: Record<string, string>) => {
    setSubmitError('');
    if (!standardId || !divisionName) {
      setSubmitError('Class and section are required');
      setStep(0);
      return;
    }
    save.mutate({
      studentName: data.studentName,
      dob: data.dateOfBirth,
      gender: data.gender,
      applyingForStandard: standardId,
      applyingForDivision: divisionName,
      parentName: data.fatherName,
      parentPhone: data.contactPhone,
      parentEmail: data.contactEmail || undefined,
      currentSchool: data.previousSchool || undefined,
      source: 'website',
      status: 'form_submitted',
      notes: [
        data.motherName && `Mother: ${data.motherName}`,
        data.currentAddress && `Address: ${data.currentAddress}, ${data.city || ''}`,
        data.lastClass && `Last class: ${data.lastClass}`,
      ].filter(Boolean).join(' | ') || undefined,
    });
  };

  if (!slug) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <p className="text-gray-500">Invalid admission link.</p>
      </div>
    );
  }

  if (loadingSchool) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (schoolError || !school) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="card p-8 max-w-md text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-2">School Not Found</h2>
          <p className="text-gray-500 text-sm">This admission link is invalid or the school is not accepting applications.</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="card p-10 max-w-lg text-center">
          <div className="text-6xl mb-4">✅</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Application Submitted!</h2>
          <p className="text-gray-500 mb-2">{school.name} has received your enquiry.</p>
          <p className="text-sm text-gray-400">We will contact you within 2 working days.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6 text-center">
          {school.logo && <img src={school.logo} alt="" className="h-14 mx-auto mb-3" />}
          <h1 className="text-2xl font-bold text-gray-900">{school.name}</h1>
          <p className="text-sm text-gray-500">
            Online Admission {school.activeAcademicYear ? `— ${school.activeAcademicYear}` : ''}
          </p>
          <p className="text-xs text-gray-400 mt-1">{school.city}{school.state ? `, ${school.state}` : ''} · {school.board}</p>
        </div>

        <div className="flex items-center mb-8 overflow-x-auto">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center flex-1 last:flex-none min-w-0">
              <div className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-sm font-bold ${i < step ? 'bg-green-500 text-white' : i === step ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-400'}`}>
                {i < step ? '✓' : i + 1}
              </div>
              <div className={`text-xs ml-2 hidden sm:block truncate ${i === step ? 'font-semibold text-gray-800' : 'text-gray-400'}`}>{s}</div>
              {i < STEPS.length - 1 && <div className={`flex-1 h-0.5 mx-2 min-w-[12px] ${i < step ? 'bg-green-500' : 'bg-gray-200'}`} />}
            </div>
          ))}
        </div>

        {submitError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{submitError}</div>
        )}

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="card p-6 space-y-4">
            {step === 0 && (
              <>
                <h3 className="font-semibold text-gray-800">Student Details</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium mb-1">Student Full Name *</label>
                    <input {...register('studentName', { required: true })} className="input-field" placeholder="As per birth certificate" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Date of Birth *</label>
                    <input {...register('dateOfBirth', { required: true })} type="date" className="input-field" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Gender *</label>
                    <select {...register('gender', { required: true })} className="input-field">
                      <option value="">Select</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <ClassDivisionPicker
                      standardId={standardId}
                      divisionName={divisionName}
                      onStandardChange={setStandardId}
                      onDivisionChange={setDivisionName}
                      standards={classes}
                      standardsLoading={loadingClasses}
                      required
                    />
                  </div>
                </div>
              </>
            )}

            {step === 1 && (
              <>
                <h3 className="font-semibold text-gray-800">Parent / Guardian Details</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Father's Name *</label>
                    <input {...register('fatherName', { required: true })} className="input-field" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Mother's Name *</label>
                    <input {...register('motherName', { required: true })} className="input-field" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Primary Contact No. *</label>
                    <input {...register('contactPhone', { required: true })} className="input-field" placeholder="+91 XXXXX XXXXX" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Email</label>
                    <input {...register('contactEmail')} type="email" className="input-field" />
                  </div>
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <h3 className="font-semibold text-gray-800">Address Details</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium mb-1">Current Address *</label>
                    <textarea {...register('currentAddress', { required: true })} rows={2} className="input-field" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">City *</label>
                    <input {...register('city', { required: true })} className="input-field" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">PIN Code</label>
                    <input {...register('pinCode')} className="input-field" />
                  </div>
                </div>
              </>
            )}

            {step === 3 && (
              <>
                <h3 className="font-semibold text-gray-800">Previous School (if applicable)</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium mb-1">Previous School Name</label>
                    <input {...register('previousSchool')} className="input-field" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Last Class Attended</label>
                    <input {...register('lastClass')} className="input-field" placeholder="e.g. Class 5" />
                  </div>
                </div>
              </>
            )}

            {step === 4 && (
              <div>
                <h3 className="font-semibold text-gray-800 mb-4">Review & Submit</h3>
                {[
                  ['Student Name', getValues('studentName')],
                  ['Date of Birth', getValues('dateOfBirth')],
                  ['Gender', getValues('gender')],
                  ['Class + Section', (() => {
                    const cls = classes.find(c => c._id === standardId);
                    return cls ? formatClassSection(cls, divisionName) : '—';
                  })()],
                  ['Father', getValues('fatherName')],
                  ['Contact', getValues('contactPhone')],
                  ['City', getValues('city')],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between py-2 border-b text-sm">
                    <span className="text-gray-500">{label}</span>
                    <span className="font-medium">{value || '—'}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-between mt-4">
            <button type="button" onClick={() => setStep(s => Math.max(0, s - 1))} disabled={step === 0} className="btn-secondary">← Previous</button>
            {step < STEPS.length - 1 ? (
              <button
                type="button"
                onClick={() => {
                  if (step === 0 && (!standardId || !divisionName)) {
                    setSubmitError('Please select both class and section');
                    return;
                  }
                  setSubmitError('');
                  setStep(s => s + 1);
                }}
                className="btn-primary"
              >
                Next →
              </button>
            ) : (
              <button type="submit" disabled={save.isPending || !standardId || !divisionName} className="btn-primary">
                {save.isPending ? 'Submitting...' : 'Submit Application'}
              </button>
            )}
          </div>
        </form>

        <p className="text-center text-xs text-gray-400 mt-8">
          Powered by School ERP · <Link to="/login" className="underline">Staff login</Link>
        </p>
      </div>
    </div>
  );
}
