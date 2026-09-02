/**
 * BaseRepository — the single place where data scope is applied.
 *
 * Architecture §6.3 / ADR-02.
 *
 * Every read AND write goes through here, and every method requires a Scope. There is no
 * un-scoped API to call, which is the point: the previous design relied on controllers
 * remembering to apply `req.rbacScope`, and all 36 of them forgot.
 *
 * Scope applies to writes as well as reads, so updating a record outside your scope
 * matches nothing and 404s rather than succeeding.
 */
const { Scope, ALL } = require('../../platform/scope/scope');
const { profileFor } = require('../../platform/scope/scopeProfiles');
const { NotFoundError } = require('../../shared/errors');

class BaseRepository {
  /**
   * @param {import('mongoose').Model} model
   * @param {object} [overrides] partial ScopeProfile overriding the registry entry
   */
  constructor(model, overrides = {}) {
    if (!model) throw new Error('BaseRepository requires a mongoose model');
    this.model = model;
    this.modelName = model.modelName;
    this.profile = { ...profileFor(model.modelName), ...overrides };
  }

  // ── Filter construction ─────────────────────────────────────────────────────

  /**
   * Turn a Scope plus caller-supplied criteria into a MongoDB filter.
   * This is the method the whole architecture rests on.
   */
  /**
   * Add a scope restriction to a field, INTERSECTING with whatever the caller already
   * asked for rather than overwriting it.
   *
   * Overwriting is a security bug in one direction and a correctness bug in the other:
   * `find(scope, { _id: x })` where the scope also constrains `_id` must return x only if
   * x is in scope — never "whatever the scope allows, ignoring x".
   */
  static constrain(filter, field, allowedIds) {
    const allowed = allowedIds.map(String);
    const existing = filter[field];

    if (existing === undefined) {
      filter[field] = { $in: allowedIds };
      return;
    }

    // Caller asked for one specific value.
    if (typeof existing !== 'object' || existing === null || existing._bsontype) {
      filter[field] = allowed.includes(String(existing)) ? existing : { $in: [] };
      return;
    }

    // Caller asked for a set.
    if (Array.isArray(existing.$in)) {
      filter[field] = { $in: existing.$in.filter((v) => allowed.includes(String(v))) };
      return;
    }

    // Anything else ($ne, $gt, a nested doc): keep both via $and.
    filter.$and = [...(filter.$and || []), { [field]: { $in: allowedIds } }];
  }

  buildFilter(scope, extra = {}) {
    this.#assertScope(scope);
    const p = this.profile;
    const filter = { ...extra };
    const constrain = (field, ids) => BaseRepository.constrain(filter, field, ids);

    // 1. Tenant — always, no exception, and never overridable by caller input.
    if (!p.tenantOptional) {
      if (!scope.tenantId && !scope.isSystem) {
        throw new Error(`${this.modelName}: scope has no tenantId`);
      }
      if (scope.tenantId) filter.tenantId = scope.tenantId;
    }

    // 2. Soft delete.
    if (p.softDelete && filter.deletedAt === undefined) filter.deletedAt = null;

    // A system scope sees everything below this line.
    if (scope.isSystem) return filter;

    // 3. Branch.
    //
    // Exception: for a portal user whose access is defined by an explicit list of student
    // ids (`own_children` / `own`), that list IS the boundary and is strictly narrower
    // than any branch filter. Applying branch on top would silently drop a child studying
    // at a sibling branch of the same trust — the "one app for both children" case the
    // functional specification calls out by name. Only applies to collections that
    // actually carry a student reference.
    const studentListIsBoundary =
      p.studentField &&
      scope.studentIds !== ALL &&
      ['own_children', 'own'].includes(scope.studentScope);

    if (p.branchField && scope.branchIds !== ALL && !studentListIsBoundary) {
      if (p.branchOptional) {
        // Master data (academic years, classes, subjects, courses, departments) may be
        // defined once for the whole tenant with no branch. A null branchId means
        // "shared by every branch" — filtering it out would make the school's own
        // classes invisible to its principal.
        filter.$and = [
          ...(filter.$and || []),
          { $or: [{ [p.branchField]: { $in: scope.branchIds } }, { [p.branchField]: null }] },
        ];
      } else {
        constrain(p.branchField, scope.branchIds);
      }
    }

    // 4. Academic year (temporal scope).
    if (p.yearField && scope.academicYearIds !== ALL) {
      constrain(p.yearField, scope.academicYearIds);
    }

    // 5. Data scope. 'school' and 'group' add nothing beyond branch.
    const studentDimensionApplies = p.studentField && scope.studentIds !== ALL;

    switch (scope.dataScope) {
      case 'division':
        this.#applyGroupFilter(filter, scope);
        break;
      case 'department':
        if (p.deptField) constrain(p.deptField, scope.departmentIds);
        break;
      case 'own':
        /**
         * For a PORTAL user, "own" means "my children" / "me" — which the student
         * dimension already expresses precisely. It must win over the owner field:
         * a parent did not *author* their child's marks row, so constraining
         * `enteredBy` to the parent returns nothing at all.
         */
        if (studentListIsBoundary) break;

        if (p.ownerField) {
          constrain(p.ownerField, [scope.userId]);
        } else if (studentDimensionApplies) {
          break;
        } else {
          this.#applyGroupFilter(filter, scope);
        }
        break;
      case 'none':
        filter._id = { $in: [] }; // matches nothing
        break;
      default:
        break; // 'school' | 'group'
    }

    // 6. Student scope — layered on top, intersecting with any caller filter.
    if (p.studentField && scope.studentIds !== ALL) {
      constrain(p.studentField, scope.studentIds);
    }

    return filter;
  }

  /**
   * Apply the academic-group restriction.
   *
   * TRANSITIONAL (architecture §21 step 4): until `AcademicGroup` lands in Phase 3, a
   * group identifier is the legacy `{ standardId, divisionName }` pair rather than an id,
   * and collections carry those two fields instead of `academicGroupId`. Both shapes are
   * supported so class teachers keep working across the migration; the legacy branch is
   * deleted once the dual-write window closes.
   */
  #applyGroupFilter(filter, scope) {
    const p = this.profile;
    const ids = scope.groupIds || [];

    /**
     * Does the academic-group dimension constrain this collection at all?
     *
     * This check MUST come before the empty-ids guard. Previously "assigned to no groups →
     * see nothing" fired for every collection, including ones with no group linkage —
     * so a subject teacher (dataScope 'own') could not see a single Exam, because Exam has
     * neither a group field nor an owner field. An exam header is school-level; it is the
     * MARKS that are group-scoped, and those carry academicGroupId and enteredBy.
     */
    const isGroupScoped = !!p.groupField || !!p.legacyGroupFields;
    if (!isGroupScoped) return;

    if (!ids.length) {
      filter._id = { $in: [] }; // group-scoped, but assigned to nothing → sees nothing
      return;
    }

    const isLegacyPair = typeof ids[0] === 'object' && ids[0] !== null && 'standardId' in ids[0];

    if (isLegacyPair) {
      if (!p.legacyGroupFields) return; // not class-scoped under the legacy shape
      const [stdField, divField] = p.legacyGroupFields;
      const clauses = ids.map((g) => ({ [stdField]: g.standardId, [divField]: g.divisionName }));
      filter.$and = [...(filter.$and || []), { $or: clauses }];
      return;
    }

    if (p.groupField) filter[p.groupField] = { $in: ids };
  }

  #assertScope(scope) {
    if (!(scope instanceof Scope)) {
      throw new Error(
        `${this.modelName}: a Scope instance is required. ` +
          'Use req.scope, or Scope.system(reason) for background work.',
      );
    }
  }

  // ── Reads ───────────────────────────────────────────────────────────────────

  find(scope, criteria = {}, opts = {}) {
    let q = this.model.find(this.buildFilter(scope, criteria));
    if (opts.select) q = q.select(opts.select);
    if (opts.populate) q = q.populate(opts.populate);
    if (opts.sort) q = q.sort(opts.sort);
    if (opts.skip) q = q.skip(opts.skip);
    if (opts.limit) q = q.limit(opts.limit);
    if (opts.lean) q = q.lean();
    if (opts.session) q = q.session(opts.session);
    return q;
  }

  findOne(scope, criteria = {}, opts = {}) {
    let q = this.model.findOne(this.buildFilter(scope, criteria));
    if (opts.select) q = q.select(opts.select);
    if (opts.populate) q = q.populate(opts.populate);
    if (opts.lean) q = q.lean();
    if (opts.session) q = q.session(opts.session);
    return q;
  }

  findById(scope, id, opts = {}) {
    return this.findOne(scope, { _id: id }, opts);
  }

  /** Like findById but throws a 404 instead of returning null. */
  async findByIdOrFail(scope, id, opts = {}) {
    const doc = await this.findById(scope, id, opts);
    if (!doc) throw new NotFoundError(`${this.modelName} not found`);
    return doc;
  }

  count(scope, criteria = {}, opts = {}) {
    const q = this.model.countDocuments(this.buildFilter(scope, criteria));
    return opts.session ? q.session(opts.session) : q;
  }

  exists(scope, criteria = {}) {
    return this.model.exists(this.buildFilter(scope, criteria));
  }

  /** Standard paginated list. Every list endpoint uses this — nothing returns unbounded. */
  async paginate(scope, criteria = {}, { page = 1, limit = 20, sort = { createdAt: -1 }, ...opts } = {}) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.find(scope, criteria, { ...opts, sort, skip, limit }),
      this.count(scope, criteria),
    ]);
    return { items, total, page, limit };
  }

  /**
   * Aggregation with the scope filter injected as the FIRST $match stage, so a pipeline
   * can never accidentally scan across tenants (verification B1).
   */
  aggregate(scope, pipeline = [], opts = {}) {
    const stages = [{ $match: this.buildFilter(scope) }, ...pipeline];
    const a = this.model.aggregate(stages);
    return opts.session ? a.session(opts.session) : a;
  }

  // ── Writes ──────────────────────────────────────────────────────────────────

  /**
   * Create. tenantId and branchId are stamped FROM SCOPE and cannot be supplied by the
   * caller — a body carrying `branchId: <other branch>` is ignored (verification A2).
   */
  async create(scope, data, opts = {}) {
    this.#assertScope(scope);
    const p = this.profile;
    const doc = { ...data };

    delete doc.tenantId;
    if (p.branchField && p.branchField !== '_id') delete doc[p.branchField];

    if (!p.tenantOptional) doc.tenantId = scope.tenantId;
    if (p.branchField && p.branchField !== '_id') {
      doc[p.branchField] = this.#defaultBranch(scope, data);
    }

    const [created] = await this.model.create([doc], { session: opts.session });
    return created;
  }

  #defaultBranch(scope, data) {
    // An all-branches actor must say which branch they are writing into.
    if (scope.branchIds === ALL) return data[this.profile.branchField] ?? null;
    if (scope.branchIds.length === 1) return scope.branchIds[0];
    // Multiple assigned branches: honour an explicit, in-scope choice.
    const requested = data[this.profile.branchField];
    if (requested && scope.branchIds.map(String).includes(String(requested))) return requested;
    return scope.branchIds[0];
  }

  /** Scoped update. Out-of-scope documents simply do not match. */
  updateOne(scope, criteria, update, opts = {}) {
    const patch = { ...update };
    delete patch.tenantId;
    return this.model.findOneAndUpdate(this.buildFilter(scope, criteria), patch, {
      new: true,
      runValidators: true,
      session: opts.session,
      ...opts.mongoose,
    });
  }

  async updateByIdOrFail(scope, id, update, opts = {}) {
    const doc = await this.updateOne(scope, { _id: id }, update, opts);
    if (!doc) throw new NotFoundError(`${this.modelName} not found`);
    return doc;
  }

  updateMany(scope, criteria, update, opts = {}) {
    const patch = { ...update };
    delete patch.tenantId;
    return this.model.updateMany(this.buildFilter(scope, criteria), patch, {
      runValidators: true,
      session: opts.session,
    });
  }

  /** Soft delete where the collection supports it, hard delete otherwise. */
  async remove(scope, id, opts = {}) {
    if (this.profile.softDelete) {
      const doc = await this.updateOne(scope, { _id: id }, { $set: { deletedAt: new Date() } }, opts);
      if (!doc) throw new NotFoundError(`${this.modelName} not found`);
      return doc;
    }
    const res = await this.model.deleteOne(this.buildFilter(scope, { _id: id }), {
      session: opts.session,
    });
    if (!res.deletedCount) throw new NotFoundError(`${this.modelName} not found`);
    return { deleted: true };
  }

  /** Escape hatch for a scoped bulk write; still filtered, still explicit. */
  bulkWrite(scope, operations, opts = {}) {
    this.#assertScope(scope);
    const scoped = operations.map((op) => {
      const [kind] = Object.keys(op);
      if (op[kind].filter) op[kind].filter = this.buildFilter(scope, op[kind].filter);
      return op;
    });
    return this.model.bulkWrite(scoped, { session: opts.session });
  }
}

/** Factory so modules read as `const students = repo(Student)`. */
function repo(model, overrides) {
  return new BaseRepository(model, overrides);
}

module.exports = { BaseRepository, repo };
