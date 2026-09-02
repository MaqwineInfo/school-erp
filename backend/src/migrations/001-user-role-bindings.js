/**
 * Migration 001 — create UserRole bindings for existing users.
 *
 * Architecture §21 step 5. Before this, permissions came from a single `User.role` string
 * matched against the legacy `Permission` collection. Two role vocabularies existed and
 * disagreed, which is how `school_owner` ended up as a valid user role with no permissions
 * at all — that user was 403'd everywhere and saw an empty sidebar.
 *
 * This maps every legacy role string onto the new model:
 *   - a role that is now one of the 12 system roles  → binding to that system role
 *   - a role that is now a template                  → binding to the tenant's template
 *   - `school_owner`                                 → school_admin + trustee template
 *   - `transport_incharge`                           → transport_manager (renamed)
 *   - `staff`                                        → teacher (the closest system role)
 *
 * Idempotent: re-running creates no duplicates.
 */
const mongoose = require('mongoose');

const MIGRATION_ID = '001-user-role-bindings';

/**
 * legacy `User.role` → { primary: <system role slug>, extra: [<template slugs>] }
 */
const LEGACY_ROLE_MAP = {
  // Already system roles — a straight binding.
  super_admin: { primary: 'super_admin', extra: [] },
  principal: { primary: 'principal', extra: [] },
  teacher: { primary: 'teacher', extra: [] },
  student: { primary: 'student', extra: [] },
  parent: { primary: 'parent', extra: [] },
  accountant: { primary: 'accountant', extra: [] },
  hr_manager: { primary: 'hr_manager', extra: [] },
  librarian: { primary: 'librarian', extra: [] },
  receptionist: { primary: 'receptionist', extra: [] },
  driver: { primary: 'driver', extra: [] },

  // Renamed.
  transport_incharge: { primary: 'transport_manager', extra: [] },

  // Now templates: the user keeps a minimal system role and gains the template binding
  // that actually carries their permissions.
  vice_principal: { primary: 'teacher', extra: ['vice_principal'] },
  hod: { primary: 'teacher', extra: ['hod'] },
  class_teacher: { primary: 'teacher', extra: ['class_teacher'] },
  admission_officer: { primary: 'receptionist', extra: ['admission_officer'] },
  cashier: { primary: 'receptionist', extra: ['cashier'] },
  hostel_warden: { primary: 'teacher', extra: ['hostel_warden'] },

  // The hole this migration exists to close.
  school_owner: { primary: 'school_admin', extra: ['trustee'] },

  // Generic staff — no elevated access; the school assigns a template afterwards.
  staff: { primary: 'teacher', extra: [] },
};

async function up({ session } = {}) {
  const User = mongoose.model('User');
  const Role = mongoose.model('Role');
  const UserRole = mongoose.model('UserRole');

  const users = await User.find({ deletedAt: null }).select('_id tenantId role').lean();

  const stats = { users: users.length, bindings: 0, skipped: 0, unmapped: [] };

  // Cache role lookups: slug + tenant → role document.
  const roleCache = new Map();
  async function findRole(slug, tenantId) {
    const key = `${slug}:${tenantId ?? 'global'}`;
    if (roleCache.has(key)) return roleCache.get(key);
    const doc = await Role.findOne({
      slug,
      deletedAt: null,
      $or: [{ tenantId }, { tenantId: null }],
    })
      .sort({ tenantId: -1 })
      .lean();
    roleCache.set(key, doc);
    return doc;
  }

  for (const user of users) {
    const mapping = LEGACY_ROLE_MAP[user.role];

    if (!mapping) {
      // An unmapped role is a data problem, not something to guess at.
      stats.unmapped.push({ userId: String(user._id), role: user.role });
      continue;
    }

    const slugs = [mapping.primary, ...mapping.extra];

    for (const [index, slug] of slugs.entries()) {
      const role = await findRole(slug, user.tenantId);
      if (!role) {
        stats.unmapped.push({ userId: String(user._id), role: slug, reason: 'role not seeded' });
        continue;
      }

      const res = await UserRole.updateOne(
        { tenantId: user.tenantId, userId: user._id, roleId: role._id },
        {
          $setOnInsert: {
            tenantId: user.tenantId,
            userId: user._id,
            roleId: role._id,
            roleSlug: role.slug,
            isPrimary: index === 0,
            validFrom: new Date(),
            validTo: null,
            isActive: true,
          },
        },
        { upsert: true, session },
      );

      if (res.upsertedCount) stats.bindings += 1;
      else stats.skipped += 1;
    }

    // Point the denormalised primary at the new system role slug.
    if (user.role !== mapping.primary) {
      await User.updateOne({ _id: user._id }, { $set: { role: mapping.primary } }, { session });
    }
  }

  return stats;
}

/** Reverse: remove the bindings this migration created. Legacy `User.role` is NOT restored. */
async function down({ session } = {}) {
  const UserRole = mongoose.model('UserRole');
  const res = await UserRole.deleteMany({}, { session });
  return { deleted: res.deletedCount };
}

module.exports = { id: MIGRATION_ID, up, down, LEGACY_ROLE_MAP };
