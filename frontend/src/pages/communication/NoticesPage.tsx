import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Bell, Calendar } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input, Select } from '../../components/ui/Input';
import { noticeService } from '../../services';
import type { Notice } from '../../types';

const typeOptions = ['general','academic','fee','exam','event','emergency','other'].map(v => ({ value: v, label: v.charAt(0).toUpperCase() + v.slice(1) }));
const scopeOptions = ['school','standard','division','staff','parents','students'].map(v => ({ value: v, label: v.charAt(0).toUpperCase() + v.slice(1) }));

const typeColors: Record<string, 'default' | 'info' | 'warning' | 'danger' | 'success' | 'purple'> = {
  general: 'default', academic: 'info', fee: 'warning', exam: 'purple', event: 'success', emergency: 'danger',
};

export default function NoticesPage() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<Partial<Notice>>({ type: 'general', audience: { scope: 'school' }, isPublished: true });

  const { data, isLoading } = useQuery({ queryKey: ['notices'], queryFn: () => noticeService.list() });

  const createMutation = useMutation({
    mutationFn: noticeService.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['notices'] }); setShowModal(false); setForm({ type: 'general', audience: { scope: 'school' }, isPublished: true }); },
  });

  const notices = data?.data || [];

  return (
    <div>
      <PageHeader
        title="Notice Board"
        description="Post and manage school notices and circulars"
        breadcrumb={[{ label: 'Home' }, { label: 'Communication' }, { label: 'Notices' }]}
        actions={<Button icon={<Plus className="w-4 h-4" />} onClick={() => setShowModal(true)}>Post Notice</Button>}
      />

      {isLoading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-24 bg-white rounded-xl border animate-pulse" />)}</div>
      ) : notices.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Bell className="w-10 h-10 mx-auto mb-3 text-gray-300" />
          <p>No notices posted yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notices.map(notice => (
            <Card key={notice._id} padding="md" className="hover:shadow-md transition-shadow">
              <div className="flex items-start gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${notice.type === 'emergency' ? 'bg-red-100' : 'bg-blue-100'}`}>
                  <Bell className={`w-5 h-5 ${notice.type === 'emergency' ? 'text-red-600' : 'text-blue-600'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-gray-900">{notice.title}</h3>
                    <Badge variant={typeColors[notice.type] || 'default'}>{notice.type}</Badge>
                  </div>
                  <p className="text-sm text-gray-600 mt-1 line-clamp-2">{notice.content}</p>
                  <div className="flex items-center gap-4 mt-2">
                    <span className="flex items-center gap-1 text-xs text-gray-400">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(notice.publishAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                    <span className="text-xs text-gray-400">
                      For: {notice.audience?.scope}
                    </span>
                    {typeof notice.createdBy === 'object' && notice.createdBy && (
                      <span className="text-xs text-gray-400">
                        By: {(notice.createdBy as { name: string }).name}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Post New Notice"
        size="lg"
        footer={
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button loading={createMutation.isPending} onClick={() => createMutation.mutate(form)}>Post Notice</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Input label="Notice Title *" value={form.title || ''} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          <div className="grid grid-cols-2 gap-4">
            <Select label="Type" value={form.type || 'general'} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} options={typeOptions} />
            <Select label="Audience" value={form.audience?.scope || 'school'} onChange={e => setForm(f => ({ ...f, audience: { ...f.audience, scope: e.target.value } }))} options={scopeOptions} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Content *</label>
            <textarea
              value={form.content || ''}
              onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
              rows={5}
              placeholder="Write the notice content here..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="publish-now" checked={form.isPublished} onChange={e => setForm(f => ({ ...f, isPublished: e.target.checked }))} className="w-4 h-4 text-blue-600 rounded" />
            <label htmlFor="publish-now" className="text-sm text-gray-700">Publish immediately</label>
          </div>
        </div>
      </Modal>
    </div>
  );
}
