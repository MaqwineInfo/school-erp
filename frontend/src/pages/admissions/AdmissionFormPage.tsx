import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import axios from '../../lib/api';

const STEPS = ['Student Details', 'Parent / Guardian', 'Address', 'Previous School', 'Review & Submit'];

export default function AdmissionFormPage() {
  const [step, setStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const navigate = useNavigate();
  const { register, handleSubmit, getValues, formState: { errors } } = useForm();

  const save = useMutation({
    mutationFn: (d: object) => axios.post('/admissions/enquiries', d),
    onSuccess: () => setSubmitted(true),
  });

  const onSubmit = (data: object) => save.mutate({ ...data, source: 'online_form' });

  if (submitted) {
    return (
      <div className="p-6 max-w-lg mx-auto text-center mt-10">
        <div className="card p-10">
          <div className="text-6xl mb-4">✅</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Application Submitted!</h2>
          <p className="text-gray-500 mb-6">Your admission enquiry has been registered. The school will contact you shortly.</p>
          <button onClick={() => navigate('/admissions/enquiries')} className="btn-primary">View All Enquiries</button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Online Admission Form</h1>
        <p className="text-sm text-gray-500">New student admission for the upcoming academic year</p>
      </div>

      {/* Step Progress */}
      <div className="flex items-center mb-8">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center flex-1 last:flex-none">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${i < step ? 'bg-green-500 text-white' : i === step ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-400'}`}>
              {i < step ? '✓' : i + 1}
            </div>
            <div className={`text-xs ml-2 ${i === step ? 'font-semibold text-gray-800' : 'text-gray-400'}`}>{s}</div>
            {i < STEPS.length - 1 && <div className={`flex-1 h-0.5 mx-2 ${i < step ? 'bg-green-500' : 'bg-gray-200'}`} />}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="card p-6 space-y-4">
          {/* Step 0: Student Details */}
          {step === 0 && (
            <>
              <h3 className="font-semibold text-gray-800">Student Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
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
                <div>
                  <label className="block text-sm font-medium mb-1">Admission For Class *</label>
                  <select {...register('admissionClass', { required: true })} className="input-field">
                    {['Nursery', 'LKG', 'UKG', 'Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5', 'Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10', 'Class 11', 'Class 12'].map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Blood Group</label>
                  <select {...register('bloodGroup')} className="input-field">
                    <option value="">Select</option>
                    {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Nationality</label>
                  <input {...register('nationality')} defaultValue="Indian" className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Religion</label>
                  <select {...register('religion')} className="input-field">
                    <option value="">Select</option>
                    {['Hindu', 'Muslim', 'Christian', 'Sikh', 'Jain', 'Buddhist', 'Other'].map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Category</label>
                  <select {...register('category')} className="input-field">
                    <option value="">Select</option>
                    {['General', 'OBC', 'SC', 'ST', 'EWS', 'NT'].map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Aadhar No.</label>
                  <input {...register('aadharNo')} className="input-field" placeholder="12-digit Aadhar number" />
                </div>
              </div>
            </>
          )}

          {/* Step 1: Parent/Guardian */}
          {step === 1 && (
            <>
              <h3 className="font-semibold text-gray-800">Parent / Guardian Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Father's Name *</label>
                  <input {...register('fatherName', { required: true })} className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Father's Occupation</label>
                  <input {...register('fatherOccupation')} className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Mother's Name *</label>
                  <input {...register('motherName', { required: true })} className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Mother's Occupation</label>
                  <input {...register('motherOccupation')} className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Primary Contact No. *</label>
                  <input {...register('contactPhone', { required: true })} className="input-field" placeholder="+91 XXXXX XXXXX" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Email</label>
                  <input {...register('contactEmail')} type="email" className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Annual Family Income</label>
                  <input {...register('annualIncome')} type="number" className="input-field" placeholder="In rupees" />
                </div>
              </div>
            </>
          )}

          {/* Step 2: Address */}
          {step === 2 && (
            <>
              <h3 className="font-semibold text-gray-800">Address Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">Current Address *</label>
                  <textarea {...register('currentAddress', { required: true })} rows={2} className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">City *</label>
                  <input {...register('city', { required: true })} className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">State</label>
                  <input {...register('state')} defaultValue="Maharashtra" className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">PIN Code</label>
                  <input {...register('pinCode')} className="input-field" />
                </div>
              </div>
            </>
          )}

          {/* Step 3: Previous School */}
          {step === 3 && (
            <>
              <h3 className="font-semibold text-gray-800">Previous School (if applicable)</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">Previous School Name</label>
                  <input {...register('previousSchool')} className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Last Class Attended</label>
                  <input {...register('lastClass')} className="input-field" placeholder="e.g. Class 5" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Last Board/Exam %</label>
                  <input {...register('lastPercentage')} type="number" className="input-field" placeholder="e.g. 85" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">TC Number</label>
                  <input {...register('tcNumber')} className="input-field" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">Reason for School Change</label>
                  <textarea {...register('reason')} rows={2} className="input-field" />
                </div>
              </div>
            </>
          )}

          {/* Step 4: Review */}
          {step === 4 && (
            <div>
              <h3 className="font-semibold text-gray-800 mb-4">Review & Submit</h3>
              {[
                ['Student Name', getValues('studentName')], ['Date of Birth', getValues('dateOfBirth')],
                ['Gender', getValues('gender')], ['Class Applying For', getValues('admissionClass')],
                ['Father', getValues('fatherName')], ['Mother', getValues('motherName')],
                ['Contact', getValues('contactPhone')], ['Email', getValues('contactEmail')],
                ['City', getValues('city')], ['Previous School', getValues('previousSchool') || 'N/A'],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between py-2 border-b text-sm">
                  <span className="text-gray-500">{label}</span>
                  <span className="font-medium">{value || '—'}</span>
                </div>
              ))}
              <div className="mt-4 bg-blue-50 text-blue-700 px-4 py-3 rounded-lg text-sm">
                By submitting this form, you confirm that all information provided is accurate. The school will contact you within 2 working days.
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex justify-between mt-4">
          <button type="button" onClick={() => setStep(s => Math.max(0, s - 1))} disabled={step === 0} className="btn-secondary">← Previous</button>
          {step < STEPS.length - 1 ? (
            <button type="button" onClick={() => setStep(s => s + 1)} className="btn-primary">Next →</button>
          ) : (
            <button type="submit" disabled={save.isPending} className="btn-primary">
              {save.isPending ? 'Submitting...' : '✅ Submit Application'}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
