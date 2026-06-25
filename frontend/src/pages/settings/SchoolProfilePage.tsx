import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import axios from '../../lib/api';

export default function SchoolProfilePage() {
  const qc = useQueryClient();
  const { register, handleSubmit, reset, formState: { isDirty, isSubmitting } } = useForm();

  const { data: tenant, isLoading } = useQuery({
    queryKey: ['school-profile'],
    queryFn: () => axios.get('/settings/profile').then(r => r.data.data),
  });

  useEffect(() => { if (tenant) reset(tenant); }, [tenant]);

  const update = useMutation({
    mutationFn: (d: object) => axios.put('/settings/profile', d),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['school-profile'] }),
  });

  if (isLoading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div></div>;

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">School Profile Settings</h1>
          <p className="text-sm text-gray-500">Update school information, contact details and branding</p>
        </div>
        {update.isSuccess && <div className="text-sm text-green-600 font-medium">✅ Profile saved!</div>}
      </div>

      <form onSubmit={handleSubmit(d => update.mutate(d))} className="space-y-6">
        {/* Basic Info */}
        <div className="card p-6">
          <h3 className="font-semibold text-gray-800 mb-4">Basic Information</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">School Name *</label>
              <input {...register('name', { required: true })} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Tagline / Motto</label>
              <input {...register('tagline')} className="input-field" placeholder="e.g. Knowledge is Power" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Affiliation No.</label>
              <input {...register('affiliationNo')} className="input-field" placeholder="CBSE/State Board affiliation" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">UDISE Code</label>
              <input {...register('udiseCode')} className="input-field" placeholder="11 digit UDISE code" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Management Type</label>
              <select {...register('managementType')} className="input-field">
                <option value="">Select</option>
                <option value="private">Private Unaided</option>
                <option value="private_aided">Private Aided</option>
                <option value="government">Government</option>
                <option value="trust">Trust / NGO</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Established Year</label>
              <input {...register('established')} type="number" className="input-field" placeholder="e.g. 1995" />
            </div>
          </div>
        </div>

        {/* Contact */}
        <div className="card p-6">
          <h3 className="font-semibold text-gray-800 mb-4">Contact & Location</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">Address</label>
              <textarea {...register('address')} rows={2} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">City</label>
              <input {...register('city')} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">State</label>
              <input {...register('state')} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">PIN Code</label>
              <input {...register('pinCode')} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Phone</label>
              <input {...register('phone')} className="input-field" placeholder="+91 XXXXX XXXXX" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input {...register('email')} type="email" className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Website</label>
              <input {...register('website')} className="input-field" placeholder="https://" />
            </div>
          </div>
        </div>

        {/* Settings */}
        <div className="card p-6">
          <h3 className="font-semibold text-gray-800 mb-4">Academic Settings</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Academic Year Pattern</label>
              <select {...register('settings.academicYearPattern')} className="input-field">
                <option value="Apr-Mar">April – March (Default)</option>
                <option value="Jun-May">June – May</option>
                <option value="Jan-Dec">January – December</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Division Label</label>
              <select {...register('settings.divisionLabel')} className="input-field">
                <option value="division">Division (A, B, C)</option>
                <option value="section">Section (A, B, C)</option>
                <option value="batch">Batch</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Grading System</label>
              <select {...register('settings.gradingSystem')} className="input-field">
                <option value="percentage">Percentage</option>
                <option value="cbse_cce">CBSE CCE (A1-E)</option>
                <option value="gpa">GPA (0-10)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Working Days/Week</label>
              <select {...register('settings.workingDays')} className="input-field">
                <option value="5">5 days (Mon-Fri)</option>
                <option value="6">6 days (Mon-Sat)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Branding */}
        <div className="card p-6">
          <h3 className="font-semibold text-gray-800 mb-4">Branding</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Primary Color</label>
              <div className="flex gap-2">
                <input {...register('primaryColor')} type="color" className="w-12 h-10 rounded border border-gray-300 cursor-pointer" />
                <input {...register('primaryColor')} className="input-field" placeholder="#3b82f6" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Secondary Color</label>
              <div className="flex gap-2">
                <input {...register('secondaryColor')} type="color" className="w-12 h-10 rounded border border-gray-300 cursor-pointer" />
                <input {...register('secondaryColor')} className="input-field" placeholder="#1e40af" />
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button type="submit" disabled={isSubmitting || !isDirty} className="btn-primary px-8">
            {isSubmitting ? 'Saving...' : '💾 Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}
