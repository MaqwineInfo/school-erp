const mongoose = require('mongoose');

const mealMenuSchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  date: { type: Date, required: true },
  mealType: { type: String, enum: ['breakfast', 'lunch', 'snack', 'dinner'], default: 'lunch' },
  items: [{ type: String }],
  notes: { type: String },
  academicYearId: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear' },
  deletedAt: { type: Date, default: null },
}, { timestamps: true });

mealMenuSchema.index({ tenantId: 1, date: 1, mealType: 1 });

module.exports = mongoose.model('MealMenu', mealMenuSchema);
