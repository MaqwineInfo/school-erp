const mongoose = require('mongoose');

const vehicleSchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
  number: { type: String, required: true, uppercase: true },
  type: { type: String, enum: ['bus','mini_bus','van','auto'], default: 'bus' },
  capacity: { type: Number, default: 40 },
  driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  conductorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  insuranceExpiry: { type: Date },
  pucExpiry: { type: Date },
  fitnessExpiry: { type: Date },
  roadTaxExpiry: { type: Date },
  isActive: { type: Boolean, default: true },
  deletedAt: { type: Date, default: null },
}, { timestamps: true });

vehicleSchema.index({ tenantId: 1, number: 1 }, { unique: true, partialFilterExpression: { deletedAt: null } });

const routeSchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
  vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle' },
  name: { type: String, required: true },
  code: { type: String },
  stops: [{
    name: { type: String },
    sequence: { type: Number },
    pickupTime: { type: String },
    dropTime: { type: String },
    distance: { type: Number }, // km from school
    fee: { type: Number, default: 0 },
  }],
  isActive: { type: Boolean, default: true },
  deletedAt: { type: Date, default: null },
}, { timestamps: true });

routeSchema.index({ tenantId: 1, name: 1 });

const Vehicle = mongoose.model('Vehicle', vehicleSchema);
const Route = mongoose.model('Route', routeSchema);

module.exports = { Vehicle, Route };
