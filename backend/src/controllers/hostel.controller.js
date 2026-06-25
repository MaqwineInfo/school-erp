const { HostelRoom, HostelAllocation } = require('../models/Hostel');
const { AppError } = require('../shared/errors');
const { sendSuccess } = require('../shared/response');

exports.listRooms = async (req, res) => {
  const { block, gender, available } = req.query;
  const filter = { tenantId: req.tenantId, deletedAt: null };
  if (block) filter.block = block;
  if (gender) filter.gender = gender;
  if (available === 'true') filter.$expr = { $lt: ['$occupancy', '$capacity'] };
  const rooms = await HostelRoom.find(filter).sort({ block: 1, roomNo: 1 });
  sendSuccess(res, rooms);
};

exports.addRoom = async (req, res) => {
  const room = await HostelRoom.create({ ...req.body, tenantId: req.tenantId, branchId: req.user.branchId });
  sendSuccess(res, room, 'Room added', 201);
};

exports.updateRoom = async (req, res) => {
  const room = await HostelRoom.findOneAndUpdate({ _id: req.params.id, tenantId: req.tenantId }, { $set: req.body }, { new: true });
  if (!room) throw new AppError('Room not found', 404);
  sendSuccess(res, room, 'Room updated');
};

exports.allocate = async (req, res) => {
  const { studentId, roomId, bedNo, from, academicYearId } = req.body;
  const room = await HostelRoom.findOne({ _id: roomId, tenantId: req.tenantId });
  if (!room) throw new AppError('Room not found', 404);
  if (room.occupancy >= room.capacity) throw new AppError('Room is full', 409);

  const alloc = await HostelAllocation.create({ tenantId: req.tenantId, studentId, roomId, bedNo, from, academicYearId, status: 'active' });
  await HostelRoom.findByIdAndUpdate(roomId, { $inc: { occupancy: 1 } });
  sendSuccess(res, alloc, 'Student allocated to room', 201);
};

exports.vacate = async (req, res) => {
  const alloc = await HostelAllocation.findOneAndUpdate(
    { _id: req.params.id, tenantId: req.tenantId, status: 'active' },
    { $set: { status: 'vacated', to: new Date() } },
    { new: true }
  );
  if (!alloc) throw new AppError('Allocation not found', 404);
  await HostelRoom.findByIdAndUpdate(alloc.roomId, { $inc: { occupancy: -1 } });
  sendSuccess(res, alloc, 'Student vacated');
};

exports.listAllocations = async (req, res) => {
  const { roomId, studentId, status, academicYearId } = req.query;
  const filter = { tenantId: req.tenantId };
  if (roomId) filter.roomId = roomId;
  if (studentId) filter.studentId = studentId;
  if (status) filter.status = status;
  if (academicYearId) filter.academicYearId = academicYearId;
  const allocs = await HostelAllocation.find(filter).populate('studentId', 'name admissionNo').populate('roomId', 'roomNo block');
  sendSuccess(res, allocs);
};
