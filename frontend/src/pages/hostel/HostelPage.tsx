import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Home, Users } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input, Select } from '../../components/ui/Input';
import { hostelService } from '../../services';

export default function HostelPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<'rooms' | 'allocations'>('rooms');
  const [showRoomModal, setShowRoomModal] = useState(false);
  const [roomForm, setRoomForm] = useState<Record<string, unknown>>({ block: '', floor: '', roomNo: '', type: 'double', capacity: 2, gender: 'boys' });

  const { data: rooms, isLoading } = useQuery({ queryKey: ['hostel-rooms'], queryFn: () => hostelService.listRooms() });
  const { data: allocs } = useQuery({ queryKey: ['hostel-allocations'], queryFn: () => hostelService.listAllocations({ status: 'active' }) });

  const addRoom = useMutation({ mutationFn: hostelService.addRoom, onSuccess: () => { qc.invalidateQueries({ queryKey: ['hostel-rooms'] }); setShowRoomModal(false); } });

  const roomData = (rooms?.data as { _id: string; block: string; floor: string; roomNo: string; type: string; capacity: number; occupancy: number; gender: string }[] | null) || [];
  const allocData = (allocs?.data as { _id: string; studentId: { name: string; admissionNo: string }; roomId: { roomNo: string; block: string }; bedNo: string; from: string }[] | null) || [];

  const genderGroups = roomData.reduce((acc, r) => { if (!acc[r.gender]) acc[r.gender] = []; acc[r.gender].push(r); return acc; }, {} as Record<string, typeof roomData>);

  return (
    <div>
      <PageHeader
        title="Hostel Management"
        description="Manage hostel rooms and student allocations"
        breadcrumb={[{ label: 'Home' }, { label: 'Hostel' }]}
        actions={<Button icon={<Plus className="w-4 h-4" />} onClick={() => setShowRoomModal(true)}>Add Room</Button>}
      />

      <div className="flex gap-1 mb-4 bg-gray-100 rounded-lg p-1 w-fit">
        {[['rooms', 'Rooms'], ['allocations', 'Allocations']].map(([t, l]) => (
          <button key={t} onClick={() => setTab(t as 'rooms' | 'allocations')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {l}
          </button>
        ))}
      </div>

      {tab === 'rooms' ? (
        isLoading ? <div className="grid grid-cols-3 gap-4">{[1,2,3].map(i => <div key={i} className="h-32 bg-white rounded-xl border animate-pulse" />)}</div> :
        Object.entries(genderGroups).map(([gender, gRooms]) => (
          <div key={gender} className="mb-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-3 capitalize">{gender} Block</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {gRooms.map(room => {
                const pct = room.capacity > 0 ? (room.occupancy / room.capacity) * 100 : 0;
                const isFull = room.occupancy >= room.capacity;
                return (
                  <Card key={room._id} className={`text-center cursor-pointer hover:border-blue-300 transition-colors ${isFull ? 'border-red-200 bg-red-50' : ''}`} padding="sm">
                    <Home className={`w-5 h-5 mx-auto mb-1 ${isFull ? 'text-red-400' : 'text-blue-400'}`} />
                    <p className="font-bold text-sm">{room.roomNo}</p>
                    <p className="text-xs text-gray-400">{room.block || 'Block A'}</p>
                    <p className="text-xs mt-1">{room.occupancy}/{room.capacity}</p>
                    <div className="mt-1.5 h-1.5 bg-gray-200 rounded-full">
                      <div className={`h-1.5 rounded-full ${pct >= 100 ? 'bg-red-500' : pct >= 70 ? 'bg-yellow-400' : 'bg-green-500'}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        ))
      ) : (
        <div className="space-y-2">
          {allocData.length === 0 ? (
            <div className="text-center py-12 text-gray-400">No active allocations</div>
          ) : allocData.map(a => (
            <div key={a._id} className="flex items-center justify-between bg-white border border-gray-200 rounded-xl px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-indigo-100 rounded-full flex items-center justify-center">
                  <Users className="w-4 h-4 text-indigo-600" />
                </div>
                <div>
                  <p className="font-medium text-sm">{a.studentId?.name}</p>
                  <p className="text-xs text-gray-400">{a.studentId?.admissionNo}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium">{a.roomId?.block} — Room {a.roomId?.roomNo}</p>
                <p className="text-xs text-gray-400">Bed: {a.bedNo || 'N/A'}</p>
              </div>
              <Badge variant="success">Active</Badge>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={showRoomModal} onClose={() => setShowRoomModal(false)} title="Add Room" size="md"
        footer={<div className="flex gap-3 justify-end"><Button variant="outline" onClick={() => setShowRoomModal(false)}>Cancel</Button><Button loading={addRoom.isPending} onClick={() => addRoom.mutate(roomForm)}>Add Room</Button></div>}>
        <div className="grid grid-cols-2 gap-4">
          <Input label="Block" value={roomForm.block as string || ''} onChange={e => setRoomForm(f => ({ ...f, block: e.target.value }))} placeholder="Boys Block A" />
          <Input label="Floor" value={roomForm.floor as string || ''} onChange={e => setRoomForm(f => ({ ...f, floor: e.target.value }))} placeholder="Ground Floor" />
          <Input label="Room No. *" value={roomForm.roomNo as string || ''} onChange={e => setRoomForm(f => ({ ...f, roomNo: e.target.value }))} placeholder="101" />
          <Select label="Type" value={roomForm.type as string || 'double'} onChange={e => setRoomForm(f => ({ ...f, type: e.target.value }))} options={[{ value: 'single', label: 'Single' }, { value: 'double', label: 'Double' }, { value: 'triple', label: 'Triple' }, { value: 'dorm', label: 'Dorm' }]} />
          <Input label="Capacity" type="number" value={roomForm.capacity as number || 2} onChange={e => setRoomForm(f => ({ ...f, capacity: +e.target.value }))} />
          <Select label="Gender" value={roomForm.gender as string || 'boys'} onChange={e => setRoomForm(f => ({ ...f, gender: e.target.value }))} options={[{ value: 'boys', label: 'Boys' }, { value: 'girls', label: 'Girls' }]} />
        </div>
      </Modal>
    </div>
  );
}
