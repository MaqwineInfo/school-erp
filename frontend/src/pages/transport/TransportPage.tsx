import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Bus, MapPin, AlertTriangle } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input, Select } from '../../components/ui/Input';
import { transportService } from '../../services';

export default function TransportPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<'vehicles' | 'routes'>('vehicles');
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [showRouteModal, setShowRouteModal] = useState(false);
  const [vehicleForm, setVehicleForm] = useState<Record<string, unknown>>({ number: '', type: 'bus', capacity: 40 });
  const [routeForm, setRouteForm] = useState<{ name: string; code: string; stops: { name: string; sequence: number; pickupTime: string; fee: number }[] }>({ name: '', code: '', stops: [] });

  const { data: vehicles, isLoading: vLoad } = useQuery({ queryKey: ['vehicles'], queryFn: transportService.listVehicles });
  const { data: routes, isLoading: rLoad } = useQuery({ queryKey: ['routes'], queryFn: transportService.listRoutes });

  const addVehicle = useMutation({ mutationFn: transportService.addVehicle, onSuccess: () => { qc.invalidateQueries({ queryKey: ['vehicles'] }); setShowVehicleModal(false); } });
  const addRoute = useMutation({ mutationFn: transportService.addRoute, onSuccess: () => { qc.invalidateQueries({ queryKey: ['routes'] }); setShowRouteModal(false); } });

  const vehicleData = (vehicles?.data as { _id: string; number: string; type: string; capacity: number; driverId?: { name: string }; insuranceExpiry?: string; isActive: boolean }[] | null) || [];
  const routeData = (routes?.data as { _id: string; name: string; code: string; stops: { name: string; sequence: number; pickupTime: string; fee: number }[]; vehicleId?: { number: string }; isActive: boolean }[] | null) || [];

  return (
    <div>
      <PageHeader
        title="Transport Management"
        description="Manage school buses, routes and allocations"
        breadcrumb={[{ label: 'Home' }, { label: 'Transport' }]}
        actions={
          tab === 'vehicles'
            ? <Button icon={<Plus className="w-4 h-4" />} onClick={() => setShowVehicleModal(true)}>Add Vehicle</Button>
            : <Button icon={<Plus className="w-4 h-4" />} onClick={() => setShowRouteModal(true)}>Add Route</Button>
        }
      />

      <div className="flex gap-1 mb-4 bg-gray-100 rounded-lg p-1 w-fit">
        {['vehicles', 'routes'].map(t => (
          <button key={t} onClick={() => setTab(t as 'vehicles' | 'routes')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === 'vehicles' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {vLoad ? [1,2,3].map(i => <div key={i} className="h-40 bg-white rounded-xl border animate-pulse" />) :
           vehicleData.length === 0 ? <div className="col-span-3 text-center py-12 text-gray-400">No vehicles added</div> :
           vehicleData.map(v => (
            <Card key={v._id}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                    <Bus className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">{v.number}</h3>
                    <p className="text-xs text-gray-400 capitalize">{v.type.replace(/_/g, ' ')}</p>
                  </div>
                </div>
                <Badge variant={v.isActive ? 'success' : 'danger'}>{v.isActive ? 'Active' : 'Inactive'}</Badge>
              </div>
              <div className="space-y-1 text-sm text-gray-600">
                <p>Capacity: <span className="font-medium">{v.capacity} seats</span></p>
                <p>Driver: <span className="font-medium">{v.driverId?.name || 'Not assigned'}</span></p>
                {v.insuranceExpiry && (
                  <p className="flex items-center gap-1 text-orange-600">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Insurance: {new Date(v.insuranceExpiry).toLocaleDateString('en-IN')}
                  </p>
                )}
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rLoad ? [1,2,3].map(i => <div key={i} className="h-40 bg-white rounded-xl border animate-pulse" />) :
           routeData.length === 0 ? <div className="col-span-3 text-center py-12 text-gray-400">No routes added</div> :
           routeData.map(r => (
            <Card key={r._id}>
              <div className="flex items-start gap-2 mb-3">
                <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">{r.name}</h3>
                  <p className="text-xs text-gray-400">Code: {r.code}</p>
                </div>
              </div>
              <p className="text-sm text-gray-600">{r.stops?.length || 0} stops</p>
              {r.vehicleId && <p className="text-xs text-gray-400 mt-1">Bus: {r.vehicleId.number}</p>}
            </Card>
          ))}
        </div>
      )}

      <Modal isOpen={showVehicleModal} onClose={() => setShowVehicleModal(false)} title="Add Vehicle" size="md"
        footer={<div className="flex gap-3 justify-end"><Button variant="outline" onClick={() => setShowVehicleModal(false)}>Cancel</Button><Button loading={addVehicle.isPending} onClick={() => addVehicle.mutate(vehicleForm)}>Add</Button></div>}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Vehicle Number *" value={vehicleForm.number as string || ''} onChange={e => setVehicleForm(f => ({ ...f, number: e.target.value }))} placeholder="GJ-01-AB-1234" />
          <Select label="Type" value={vehicleForm.type as string || 'bus'} onChange={e => setVehicleForm(f => ({ ...f, type: e.target.value }))} options={[{ value: 'bus', label: 'Bus' }, { value: 'mini_bus', label: 'Mini Bus' }, { value: 'van', label: 'Van' }, { value: 'auto', label: 'Auto' }]} />
          <Input label="Seating Capacity" type="number" value={vehicleForm.capacity as number || 40} onChange={e => setVehicleForm(f => ({ ...f, capacity: +e.target.value }))} />
          <Input type="date" label="Insurance Expiry" value={vehicleForm.insuranceExpiry as string || ''} onChange={e => setVehicleForm(f => ({ ...f, insuranceExpiry: e.target.value }))} />
          <Input type="date" label="PUC Expiry" value={vehicleForm.pucExpiry as string || ''} onChange={e => setVehicleForm(f => ({ ...f, pucExpiry: e.target.value }))} />
        </div>
      </Modal>

      <Modal isOpen={showRouteModal} onClose={() => setShowRouteModal(false)} title="Add Route" size="md"
        footer={<div className="flex gap-3 justify-end"><Button variant="outline" onClick={() => setShowRouteModal(false)}>Cancel</Button><Button loading={addRoute.isPending} onClick={() => addRoute.mutate(routeForm)}>Add</Button></div>}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Route Name *" value={routeForm.name} onChange={e => setRouteForm(f => ({ ...f, name: e.target.value }))} placeholder="Route 1 - North" />
            <Input label="Route Code" value={routeForm.code} onChange={e => setRouteForm(f => ({ ...f, code: e.target.value }))} placeholder="R01" />
          </div>
          <div>
            <div className="flex justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">Stops</label>
              <button onClick={() => setRouteForm(f => ({ ...f, stops: [...f.stops, { name: '', sequence: f.stops.length + 1, pickupTime: '', fee: 0 }] }))} className="text-xs text-blue-600 font-medium">+ Add Stop</button>
            </div>
            {routeForm.stops.map((stop, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <input value={stop.name} onChange={e => setRouteForm(f => ({ ...f, stops: f.stops.map((s, j) => j === i ? { ...s, name: e.target.value } : s) }))} placeholder={`Stop ${i+1} name`} className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none" />
                <input value={stop.pickupTime} onChange={e => setRouteForm(f => ({ ...f, stops: f.stops.map((s, j) => j === i ? { ...s, pickupTime: e.target.value } : s) }))} placeholder="Pickup time" className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none" />
                <input type="number" value={stop.fee} onChange={e => setRouteForm(f => ({ ...f, stops: f.stops.map((s, j) => j === i ? { ...s, fee: +e.target.value } : s) }))} placeholder="Fee ₹" className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none" />
              </div>
            ))}
          </div>
        </div>
      </Modal>
    </div>
  );
}
