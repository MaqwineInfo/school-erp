import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import axios from '../../lib/api';

type Item = { _id: string; name: string; category: string; itemCode?: string; unit: string; totalQuantity: number; availableQuantity: number; issuedQuantity: number; minStock: number; purchasePrice: number; vendor?: string; location?: string; isActive: boolean };

const CAT_LABELS: Record<string, string> = { furniture: '🪑 Furniture', electronics: '💻 Electronics', stationery: '📎 Stationery', sports: '⚽ Sports', lab: '🔬 Lab', library: '📚 Library', housekeeping: '🧹 Housekeeping', uniform: '👕 Uniform', other: '📦 Other' };

export default function InventoryPage() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [stockModal, setStockModal] = useState<Item | null>(null);
  const [editing, setEditing] = useState<Item | null>(null);
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const { register, handleSubmit, reset } = useForm();
  const stockForm = useForm();

  const params = new URLSearchParams({ page: String(page), ...Object.fromEntries(Object.entries({ category, search }).filter(([, v]) => v)) });
  const { data, isLoading } = useQuery({
    queryKey: ['inventory', category, search, page],
    queryFn: () => axios.get(`/inventory?${params}`).then(r => r.data),
  });
  const items: Item[] = Array.isArray(data?.data) ? data.data : data?.data?.items || [];
  const lowStock = data?.data?.lowStock || 0;

  const { data: stats } = useQuery({
    queryKey: ['inventory-stats'],
    queryFn: () => axios.get('/inventory/stats').then(r => r.data.data),
  });

  const save = useMutation({
    mutationFn: (d: object) => editing ? axios.put(`/inventory/${editing._id}`, d) : axios.post('/inventory', d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['inventory'] }); setShowModal(false); setEditing(null); reset(); },
  });

  const adjustStock = useMutation({
    mutationFn: ({ id, ...d }: { id: string; quantity: number; type: string; reason: string }) => axios.patch(`/inventory/${id}/stock`, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['inventory'] }); setStockModal(null); stockForm.reset(); },
  });

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventory Management</h1>
          <p className="text-sm text-gray-500">Track school assets, equipment, and consumables</p>
        </div>
        <button onClick={() => { setEditing(null); reset({}); setShowModal(true); }} className="btn-primary">+ Add Item</button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="card p-4 text-center"><div className="text-2xl font-bold text-blue-700">{items.length}</div><div className="text-xs text-gray-500">Total Items</div></div>
        <div className="card p-4 text-center"><div className="text-2xl font-bold text-red-500">{lowStock}</div><div className="text-xs text-gray-500">Low Stock</div></div>
        <div className="card p-4 text-center"><div className="text-2xl font-bold text-green-600">{items.reduce((s, i) => s + i.availableQuantity, 0)}</div><div className="text-xs text-gray-500">Available</div></div>
        <div className="card p-4 text-center"><div className="text-2xl font-bold text-orange-600">{items.reduce((s, i) => s + i.issuedQuantity, 0)}</div><div className="text-xs text-gray-500">Issued</div></div>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search items..." className="input-field w-64" />
        <select value={category} onChange={e => setCategory(e.target.value)} className="input-field w-44">
          <option value="">All Categories</option>
          {Object.entries(CAT_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left">Item</th>
              <th className="px-4 py-3 text-left">Category</th>
              <th className="px-4 py-3 text-center">Total</th>
              <th className="px-4 py-3 text-center">Available</th>
              <th className="px-4 py-3 text-center">Issued</th>
              <th className="px-4 py-3 text-right">Unit Price</th>
              <th className="px-4 py-3 text-left">Location</th>
              <th className="px-4 py-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? <tr><td colSpan={8} className="py-10 text-center"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div></td></tr> :
              items.map(item => (
                <tr key={item._id} className={`border-t hover:bg-gray-50 ${item.availableQuantity <= item.minStock && item.minStock > 0 ? 'bg-red-50' : ''}`}>
                  <td className="px-4 py-3 font-medium">{item.name}<div className="text-xs text-gray-400">{item.itemCode}</div></td>
                  <td className="px-4 py-3">{CAT_LABELS[item.category] || item.category}</td>
                  <td className="px-4 py-3 text-center">{item.totalQuantity} {item.unit}</td>
                  <td className="px-4 py-3 text-center font-semibold text-green-600">{item.availableQuantity}</td>
                  <td className="px-4 py-3 text-center text-orange-500">{item.issuedQuantity}</td>
                  <td className="px-4 py-3 text-right">₹{item.purchasePrice.toLocaleString('en-IN')}</td>
                  <td className="px-4 py-3 text-gray-500">{item.location || '—'}</td>
                  <td className="px-4 py-3 text-center flex gap-2 justify-center">
                    <button onClick={() => setStockModal(item)} className="text-blue-500 text-xs">Stock</button>
                    <button onClick={() => { setEditing(item); reset(item); setShowModal(true); }} className="text-green-500 text-xs">Edit</button>
                  </td>
                </tr>
              ))
            }
            {!isLoading && items.length === 0 && <tr><td colSpan={8} className="py-10 text-center text-gray-400">No inventory items</td></tr>}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <form onSubmit={handleSubmit(d => save.mutate(d))} className="bg-white rounded-2xl p-6 w-full max-w-lg space-y-4">
            <h2 className="text-lg font-bold">{editing ? 'Edit' : 'Add'} Item</h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">Item Name *</label>
                <input {...register('name', { required: true })} className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Category</label>
                <select {...register('category')} className="input-field">
                  {Object.entries(CAT_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Item Code</label>
                <input {...register('itemCode')} className="input-field" placeholder="INV-001" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Unit</label>
                <input {...register('unit')} defaultValue="nos" className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Total Quantity</label>
                <input {...register('totalQuantity', { valueAsNumber: true })} type="number" defaultValue={0} className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Available Qty</label>
                <input {...register('availableQuantity', { valueAsNumber: true })} type="number" defaultValue={0} className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Min Stock Alert</label>
                <input {...register('minStock', { valueAsNumber: true })} type="number" defaultValue={0} className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Purchase Price (₹)</label>
                <input {...register('purchasePrice', { valueAsNumber: true })} type="number" defaultValue={0} className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Vendor</label>
                <input {...register('vendor')} className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Storage Location</label>
                <input {...register('location')} className="input-field" placeholder="Room/Block" />
              </div>
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => { setShowModal(false); setEditing(null); reset(); }} className="btn-secondary flex-1">Cancel</button>
              <button type="submit" disabled={save.isPending} className="btn-primary flex-1">{save.isPending ? 'Saving...' : 'Save'}</button>
            </div>
          </form>
        </div>
      )}

      {/* Adjust Stock Modal */}
      {stockModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <form onSubmit={stockForm.handleSubmit(d => adjustStock.mutate({ id: stockModal._id, ...d }))} className="bg-white rounded-2xl p-6 w-full max-w-sm space-y-4">
            <h2 className="text-lg font-bold">Adjust Stock: {stockModal.name}</h2>
            <div className="text-sm text-gray-500">Current: {stockModal.availableQuantity} {stockModal.unit} available</div>
            <div>
              <label className="block text-sm font-medium mb-1">Transaction Type</label>
              <select {...stockForm.register('type')} className="input-field">
                <option value="add">Add (Purchase/Return)</option>
                <option value="issue">Issue (Give Out)</option>
                <option value="return">Return</option>
                <option value="damage">Damage/Loss</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Quantity *</label>
              <input {...stockForm.register('quantity', { required: true, valueAsNumber: true })} type="number" min="1" className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Reason</label>
              <input {...stockForm.register('reason')} className="input-field" placeholder="Optional reason" />
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => { setStockModal(null); stockForm.reset(); }} className="btn-secondary flex-1">Cancel</button>
              <button type="submit" disabled={adjustStock.isPending} className="btn-primary flex-1">Update Stock</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
