# Twinbin Module – Pre-Implementation Pack

This file captures the information needed before extending or integrating the Twinbin module. It summarizes scope, actors, data model, API contract, validations, acceptance checks, and open questions so implementation and QA can proceed with shared context.

## Objective & Scope
- Digitize the lifecycle of twin-bin litter points in a city: request → QC review → assignment → field visit → QC verification → action follow-up.
- Enforce geo correctness (city, zone, ward), physical condition capture, photo-backed inspections, and proximity checks for field submissions.
- Provide role-scoped access so city teams (employee, QC, action officer, city admin) see only relevant records.

## Actors & Access Control (module key `TWINBIN`)
- `EMPLOYEE`: can request bins, view their requests, view assigned bins, submit visit reports when assigned and on-site.
- `QC`: can view pending bin requests, approve/reject and optionally assign employees; reviews visit reports (approve/reject/mark action-required).
- `ACTION_OFFICER`: views QC-flagged action-required visits and records remedial action.
- `CITY_ADMIN`/`QC`/`ACTION_OFFICER`/`EMPLOYEE`: may list approved bins assigned to them (`/bins/my`).
- All routes require authenticated user with an active city context; module access is re-checked per call.

## Data Model (Prisma)
- `TwinbinLitterBin`
  - IDs: `id`, `cityId`, `requestedById`, optional `zoneId`, `wardId`.
  - Attributes: `areaName`, `areaType (RESIDENTIAL|COMMERCIAL|SLUM)`, `locationName`, `roadType`, `isFixedProperly`, `hasLid`, `condition (GOOD|DAMAGED)`, `latitude`, `longitude`.
  - Workflow: `status (PENDING_QC|APPROVED|REJECTED)`, `assignedEmployeeIds[]`, `approvedByQcId`, timestamps.
- `TwinbinVisitReport`
  - Foreign keys: `cityId`, `binId`, `submittedById`.
  - Visit payload: `visitedAt`, `latitude`, `longitude`, `distanceMeters`, `inspectionAnswers` (10 Q/A objects with photo URLs).
  - Review & action: `status (PENDING_QC|APPROVED|REJECTED)`, `actionStatus (APPROVED|REJECTED|ACTION_REQUIRED|ACTION_TAKEN)`, `qcRemark`, `actionRemark`, `actionPhotoUrl`, `actionTakenById`, `actionTakenAt`, `reviewedByQcId`, timestamps.
- `TwinbinRecord`: generic JSON payload storage (status `DRAFT|SUBMITTED|APPROVED`) not currently exposed via router.

## Status Lifecycles
- **Bin**: `PENDING_QC` (created) → `APPROVED` (QC approves, may assign employees) → `REJECTED` (QC rejects). No transition back to pending.
- **Visit report** (inspection): `PENDING_QC` → `APPROVED` (QC ok) or `REJECTED` (QC fail). Independently, `actionStatus` can be `ACTION_REQUIRED` (QC asks for fix) → `ACTION_TAKEN` (action officer updates) or `REJECTED/APPROVED` when QC finalizes.

## API Surface (base path `/modules/twinbin`)
- `POST /bins/request` (EMPLOYEE)
  - Body: zoneId?, wardId?, areaName, areaType, locationName, roadType, isFixedProperly, hasLid, condition, latitude, longitude.
  - Checks: zone/ward belong to city and ward under zone; creates bin with status `PENDING_QC`.
- `GET /bins/my-requests` (EMPLOYEE)
  - Lists bins requested by caller, newest first.
- `GET /bins/pending` (QC)
  - Lists `PENDING_QC` bins for city.
- `POST /bins/:id/approve` (QC)
  - Body: `assignedEmployeeIds?` (UUID array). Validates bin city match, status pending; validates all assignees are city employees; sets status `APPROVED`, records approver and assignments.
- `POST /bins/:id/reject` (QC)
  - Marks pending bin as `REJECTED`, clears assignments, records approver.
- `GET /bins/my` (EMPLOYEE|QC|ACTION_OFFICER|CITY_ADMIN)
  - Lists `APPROVED` bins where caller is in `assignedEmployeeIds`.
- `GET /bins/assigned` (EMPLOYEE)
  - Same dataset as `/bins/my` but limited to employees.
- `POST /bins/:id/visit` (EMPLOYEE)
  - Body: latitude, longitude, inspectionAnswers.q1–q10 { answer YES|NO, photoUrl }.
  - Checks: bin exists, city match, status `APPROVED`, caller is assigned, caller within 100m of bin; records visit with status `PENDING_QC`, stores distance.
- `GET /visits/pending` (QC)
  - Lists visit reports pending QC with bin details and submitter info; recomputes distance if missing.
- `POST /visits/:id/approve` (QC)
  - Sets visit status `APPROVED`, actionStatus `APPROVED`, reviewer id.
- `POST /visits/:id/reject` (QC)
  - Sets status `REJECTED`, actionStatus `REJECTED`, reviewer id.
- `POST /visits/:id/action-required` (QC)
  - Body: `qcRemark`; sets `actionStatus` to `ACTION_REQUIRED`, stores remark and reviewer.
- `GET /visits/action-required` (ACTION_OFFICER)
  - Lists visits needing action with bin, submitter, and reviewer summaries.
- `POST /visits/:id/action-taken` (ACTION_OFFICER)
  - Body: `actionRemark`, `actionPhotoUrl`; requires `actionStatus=ACTION_REQUIRED`; sets `ACTION_TAKEN`, records actor and timestamp.

## Validation & Business Rules
- Zone/Ward must belong to current city; ward must be child of selected zone when both provided.
- Distance guard: visit submission rejected if caller is >100 meters from recorded bin coordinates.
- Every inspection question requires an explicit YES/NO and a photo URL.
- Assignment validation: all `assignedEmployeeIds` must map to city users with role `EMPLOYEE`.
- Auth + city context required on every route; module access enforced per-role per-endpoint.

## Acceptance Checks (happy-path & guardrails)
- Bin request succeeds with valid geo; fails with 400 for invalid zone/ward pairing.
- QC approval rejects requests not in `PENDING_QC` or with non-employee assignees; approved bin shows assigned employees.
- Visit submission blocked when user not assigned, bin not approved, or distance >100m.
- QC can toggle visit status; rejection returns `REJECTED` and clears need for action.
- Action officer can only act on `ACTION_REQUIRED`; action sets `ACTION_TAKEN` and stores evidence URL.
- Listing endpoints scope data to city and caller’s role/assignments.

## Non-Functional Notes
- Authorization is role + module + city scoped; ensure permission seeds exist for `TWINBIN` roles.
- Geospatial accuracy depends on client GPS; consider rounding/validation on mobile to avoid jitter.
- Photo URLs are stored as provided; upstream upload service and validation are out of scope here.

## Open Questions / TODOs
- Should `/bins/my` and `/bins/assigned` be consolidated? They currently return identical data for employees.
- Should distance threshold be configurable per city/module?
- Are duplicate bin requests allowed for same coordinates/area? No dedupe exists today.
- Should QC be able to reassign employees after approval? Not currently supported.
- Do we need audit logs/events for approvals and actions? (Not implemented.)

