const { Vehicle, Route } = require('../models/Transport');
const { AppError } = require('../shared/errors');
const { sendSuccess } = require('../shared/response');

// Vehicles
exports.listVehicles = async (req, res) => {
  const vehicles = await Vehicle.find({ tenantId: req.tenantId, deletedAt: null }).populate('driverId', 'name phone');
  sendSuccess(res, vehicles);
};
exports.addVehicle = async (req, res) => {
  const v = await Vehicle.create({ ...req.body, tenantId: req.tenantId, branchId: req.user.branchId });
  sendSuccess(res, v, 'Vehicle added', 201);
};
exports.updateVehicle = async (req, res) => {
  const v = await Vehicle.findOneAndUpdate({ _id: req.params.id, tenantId: req.tenantId, deletedAt: null }, { $set: req.body }, { new: true });
  if (!v) throw new AppError('Vehicle not found', 404);
  sendSuccess(res, v, 'Vehicle updated');
};
exports.removeVehicle = async (req, res) => {
  await Vehicle.findOneAndUpdate({ _id: req.params.id, tenantId: req.tenantId }, { $set: { deletedAt: new Date() } });
  sendSuccess(res, null, 'Vehicle removed');
};

// Routes
exports.listRoutes = async (req, res) => {
  const routes = await Route.find({ tenantId: req.tenantId, deletedAt: null }).populate('vehicleId', 'number type');
  sendSuccess(res, routes);
};
exports.addRoute = async (req, res) => {
  const route = await Route.create({ ...req.body, tenantId: req.tenantId, branchId: req.user.branchId });
  sendSuccess(res, route, 'Route added', 201);
};
exports.updateRoute = async (req, res) => {
  const route = await Route.findOneAndUpdate({ _id: req.params.id, tenantId: req.tenantId, deletedAt: null }, { $set: req.body }, { new: true });
  if (!route) throw new AppError('Route not found', 404);
  sendSuccess(res, route, 'Route updated');
};
exports.removeRoute = async (req, res) => {
  await Route.findOneAndUpdate({ _id: req.params.id, tenantId: req.tenantId }, { $set: { deletedAt: new Date() } });
  sendSuccess(res, null, 'Route removed');
};
