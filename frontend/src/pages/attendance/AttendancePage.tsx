import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, X, Clock, AlertCircle, Save } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { attendanceService, academicService } from '../../services';

type AttendanceStatus = 'present' | 'absent' | 'late' | 'leave';

interface AttendanceRecord {
  studentId: string;
  name: string;
  rollNo?: string;
  admissionNo?: string;
  status: AttendanceStatus;
}

const statusConfig = {
  present: { label: 'P', color: 'bg-green-500 text-white', icon: <Check className="w-3 h-3" /> },
  absent: { label: 'A', color: 'bg-red-500 text-white', icon: <X className="w-3 h-3" /> },
  late: { label: 'L', color: 'bg-yellow-500 text-white', icon: <Clock className="w-3 h-3" /> },
  leave: { label: 'LV', color: 'bg-blue-500 text-white', icon: <AlertCircle className="w-3 h-3" /> },
};

export default function AttendancePage() {
  const qc = useQueryClient();
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [standardId, setStandardId] = useState('');
  const [divisionName, setDivisionName] = useState('');
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [saved, setSaved] = useState(false);

  const { data: standards } = useQuery({ queryKey: ['standards'], queryFn: academicService.listStandards });

  const selectedStandard = standards?.data?.find(s => s._id === standardId);

  const { data: attendanceData, isLoading } = useQuery({
    queryKey: ['attendance', date, standardId, divisionName],
    queryFn: () => attendanceService.getByDate({ standardId, divisionName, date }),
    enabled: !!standardId && !!divisionName,
  });

  useEffect(() => {
    if (attendanceData?.data) {
      const { attendance, students } = attendanceData.data as { attendance: { records: { studentId: { _id: string; name: string; rollNo?: string; admissionNo?: string }; status: AttendanceStatus }[] } | null; students: { _id: string; name: string; rollNo?: string; admissionNo?: string }[] };
      if (attendance?.records?.length) {
        setRecords(attendance.records.map((r) => ({
          studentId: typeof r.studentId === 'object' ? r.studentId._id : r.studentId,
          name: typeof r.studentId === 'object' ? r.studentId.name : '',
          rollNo: typeof r.studentId === 'object' ? r.studentId.rollNo : '',
          admissionNo: typeof r.studentId === 'object' ? r.studentId.admissionNo : '',
          status: r.status,
        })));
      } else if (students?.length) {
        setRecords(students.map((s) => ({ studentId: s._id, name: s.name, rollNo: s.rollNo, admissionNo: s.admissionNo, status: 'present' })));
      }
    }
    setSaved(false);
  }, [attendanceData]);

  const markMutation = useMutation({
    mutationFn: () => attendanceService.mark({
      standardId, divisionName, date,
      records: records.map(r => ({ studentId: r.studentId, status: r.status })),
    }),
    onSuccess: () => { setSaved(true); qc.invalidateQueries({ queryKey: ['attendance'] }); },
  });

  const setAll = (status: AttendanceStatus) => setRecords(r => r.map(s => ({ ...s, status })));
  const toggle = (idx: number, status: AttendanceStatus) => setRecords(r => r.map((s, i) => i === idx ? { ...s, status } : s));

  const counts = records.reduce((acc, r) => { acc[r.status] = (acc[r.status] || 0) + 1; return acc; }, {} as Record<string, number>);

  return (
    <div>
      <PageHeader
        title="Attendance"
        description="Mark and manage student attendance"
        breadcrumb={[{ label: 'Home' }, { label: 'Attendance' }]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Filters */}
        <div className="lg:col-span-1">
          <Card>
            <h3 className="font-semibold text-gray-900 mb-4">Select Class</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Date</label>
                <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Standard</label>
                <select value={standardId} onChange={e => setStandardId(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Select Standard</option>
                  {standards?.data?.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                </select>
              </div>
              {selectedStandard && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Division</label>
                  <select value={divisionName} onChange={e => setDivisionName(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">Select Division</option>
                    {selectedStandard.divisions.map(d => <option key={d.name} value={d.name}>{d.name}</option>)}
                  </select>
                </div>
              )}
            </div>
          </Card>

          {records.length > 0 && (
            <Card className="mt-4">
              <h3 className="font-semibold text-sm text-gray-900 mb-3">Summary</h3>
              <div className="space-y-2">
                {[
                  { key: 'present', label: 'Present', color: 'text-green-600' },
                  { key: 'absent', label: 'Absent', color: 'text-red-600' },
                  { key: 'late', label: 'Late', color: 'text-yellow-600' },
                  { key: 'leave', label: 'On Leave', color: 'text-blue-600' },
                ].map(s => (
                  <div key={s.key} className="flex justify-between text-sm">
                    <span className="text-gray-600">{s.label}</span>
                    <span className={`font-medium ${s.color}`}>{counts[s.key] || 0}</span>
                  </div>
                ))}
                <div className="border-t pt-2 flex justify-between text-sm font-medium">
                  <span>Total</span>
                  <span>{records.length}</span>
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* Attendance grid */}
        <div className="lg:col-span-3">
          {!standardId || !divisionName ? (
            <Card className="text-center py-16">
              <AlertCircle className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-400">Select a standard and division to mark attendance</p>
            </Card>
          ) : isLoading ? (
            <Card><div className="h-40 flex items-center justify-center text-gray-400">Loading students...</div></Card>
          ) : records.length === 0 ? (
            <Card className="text-center py-16">
              <p className="text-gray-400">No students found for this class</p>
            </Card>
          ) : (
            <Card padding="none">
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <div>
                  <h3 className="font-semibold text-gray-900">{selectedStandard?.name} - {divisionName}</h3>
                  <p className="text-xs text-gray-400">{new Date(date).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setAll('present')} className="text-xs px-3 py-1.5 bg-green-100 text-green-700 rounded-lg hover:bg-green-200">All Present</button>
                  <button onClick={() => setAll('absent')} className="text-xs px-3 py-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200">All Absent</button>
                  <Button size="sm" icon={<Save className="w-3.5 h-3.5" />} loading={markMutation.isPending} onClick={() => markMutation.mutate()}>
                    {saved ? 'Saved ✓' : 'Save'}
                  </Button>
                </div>
              </div>

              <div className="divide-y divide-gray-100">
                {records.map((student, idx) => (
                  <div key={student.studentId} className="flex items-center gap-4 px-4 py-3">
                    <span className="text-xs text-gray-400 w-6">{idx + 1}</span>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{student.name}</p>
                      <p className="text-xs text-gray-400">{student.admissionNo}</p>
                    </div>
                    <div className="flex gap-1">
                      {(['present', 'absent', 'late', 'leave'] as AttendanceStatus[]).map(s => (
                        <button
                          key={s}
                          onClick={() => toggle(idx, s)}
                          className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${student.status === s ? statusConfig[s].color : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
                          title={s}
                        >
                          {statusConfig[s].label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
