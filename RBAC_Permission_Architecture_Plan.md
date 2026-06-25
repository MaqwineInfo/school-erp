# School ERP — Enterprise RBAC Permission Architecture Plan
**Indian Edition | Multi-Branch SaaS | CBSE / ICSE / IB / State Boards + Government/Aided**
*Based on: Enterprise School ERP Indian Specification v2.0 — June 2026*

---

## Architecture Model: RBAC + Scope Attributes (Hybrid)

Every permission is a 4-tuple:

```
(Role, Module, Action, Scope)
```

| Scope Dimension    | Possible Values                                          | Example                                    |
|--------------------|----------------------------------------------------------|--------------------------------------------|
| `branch_scope`     | `all_branches`, `assigned_branches`, `own_branch`        | Trustee = all; Class Teacher = own_branch  |
| `data_scope`       | `own`, `department`, `division`, `school`, `group`       | Class Teacher = own division               |
| `student_scope`    | `own_children`, `assigned_students`, `all`               | Parent = own_children only                 |
| `temporal_scope`   | `current_ay`, `historical_read`                          | Alumni = historical_read                   |

**Multi-role resolution rule:**
- **Actions (View/Add/Edit/Approve/Export):** Union — most permissive wins.
- **Destructive actions (Delete) on sensitive modules (Fees, Payroll, Marks, Certificates):** Most restrictive wins.
- **UI:** Union of sidebar menus; dashboard shows tabbed widgets per active role context.

**Tenant Hierarchy:**

```
SaaS Super Admin
  └── Trust / Society Group
        ├── Branch A
        │     ├── Principal
        │     ├── Staff
        │     └── Students / Parents
        └── Branch B
              └── ...
```

---

## Section 1 — Complete Role Hierarchy

### Tier 0 — Platform (SaaS)
| Role | Notes |
|------|-------|
| SaaS Super Admin | Manages all tenants, plans, system updates. No student PII by default. |

### Tier 1 — Group / Trust Level
| Role | Notes |
|------|-------|
| School Owner / Trustee | Cross-branch strategic + financial view |
| Group Academic Director *(new)* | Cross-branch academic standards, curriculum oversight |
| Group Finance Controller *(new)* | Consolidated P&L, inter-branch fund transfers, payroll final release |
| Compliance Officer *(new)* | DPDP, RTE, UDISE+, POSH, board compliance |

### Tier 2 — Branch Leadership
| Role | Notes |
|------|-------|
| Branch Admin *(new)* | Full branch ops; delegates from Principal for admin tasks |
| Principal | Full academic + ops authority within branch |
| Vice Principal | Academic oversight, timetable, exams, teacher monitoring |
| Academic Supervisor / Coordinator *(new)* | Syllabus tracking, lesson plan review, CCE coordination |

### Tier 3 — Department / Functional Heads
| Role | Notes |
|------|-------|
| HoD (per department) | Subject/faculty/results for their department |
| Exam Coordinator *(new)* | Exam scheduling, date sheet, seating, marks lock |
| Admission Head / Admission Officer | Enquiries, forms, documents, fee quotation |
| Senior Accountant / Accountant | Fee, payroll, expenses, GST, day book |
| Cashier *(sub-role)* | Fee collection only; no payroll |
| HR Manager | Staff records, leaves, appraisals, recruitment |
| Reception Manager *(new)* | Supervises front office, visitor management |
| IT Administrator *(new)* | System config, roles setup, integrations, backups |
| Transport Manager / Transport In-charge | Routes, vehicles, drivers, GPS |
| Chief Warden / Hostel Warden | Hostel rooms, attendance, leave, mess |
| Librarian | Catalogue, issue/return, fines, digital library |
| Store Manager *(new)* | Inventory, indents, vendor management, asset register |
| Event Coordinator *(new)* | Events, calendar, certificates, gallery |
| Discipline Coordinator *(new)* | Behaviour incidents, POSH workflow, counsellor coordination |
| Counsellor *(new)* | Confidential student sessions, parent meeting logs |
| School Nurse / Health Officer *(new)* | Medical check-ups, clinic visits, vaccination records |
| MDM Coordinator *(new — Govt/Aided)* | Mid-Day Meal, PM POSHAN reports, beneficiary register |
| RTE Officer *(new — Govt/Aided)* | RTE 25% quota, fee exemption, state reports |

### Tier 4 — Operational Staff
| Role | Notes |
|------|-------|
| Class Teacher | Owns one Standard-Division: attendance, discipline, report cards |
| Subject Teacher / Faculty | Lesson plan, classwork, homework, marks entry |
| Receptionist | Visitor entry, gate pass, phone log, enquiry |
| Driver / Conductor | Route start/stop, student boarding scan, SOS |
| Lab Assistant *(new)* | Lab inventory, equipment log, safety records |
| Mess Manager *(new)* | Weekly menu, kitchen stock, nutritional tracking |
| UDISE+ Data Operator *(new — Govt/Aided)* | Reports module, demographic export, board submissions |

### Tier 5 — External / Portal Users
| Role | Notes |
|------|-------|
| Parent / Guardian | Own child's data: attendance, marks, fees, homework, notices |
| Student | Own data: timetable, homework, study material, results, library |
| Alumni | Directory, events, donations, mentorship |

### Reporting Relationships
```
Teachers → HoD → VP / Academic Coordinator → Principal → Trustee
Admission Officer → Admission Head → Principal
Accountant/Cashier → Finance Controller (group) + Principal (branch)
HR Manager → Principal (branch) + Finance Controller (payroll release)
Store Manager → Accountant → Principal
IT Admin → Branch Admin → Principal
Counsellor → Discipline Coordinator → VP → Principal
Nurse → Principal (medical matters) + HR (leave)
Transport Manager → Branch Admin → Principal
Hostel Warden → Branch Admin → Principal
```

---

## Section 2 — Detailed Role Definitions

### 2.1 SaaS Super Admin
| Field | Detail |
|-------|--------|
| Purpose | Manage all school tenants, subscription plans, system-wide config |
| Responsibilities | Tenant provisioning/deprovisioning, plan upgrades, system health, global announcements |
| Reports To | — (Platform owner) |
| Accessible Modules | Settings (global), SaaS Operations, Audit Logs (system level), Role Management (global templates) |
| Restricted Modules | Student PII, Fees, Payroll, Marks (unless tenant grants explicit support access) |
| Branch Scope | `all_branches` across all tenants |
| Data Scope | `group` (tenant metadata only, not transactional data by default) |

---

### 2.2 School Owner / Trustee
| Field | Detail |
|-------|--------|
| Purpose | Strategic oversight of all branches; financial and academic accountability |
| Responsibilities | Approve high-value fee waivers, final payroll sign-off, view cross-branch reports, set annual fee structures |
| Reports To | Board / Society |
| Accessible Modules | Reports (all), Fees (view + approve waivers), Payroll (view), HR (view), Admissions (view), Expenses (approve large), Audit Logs (view), Dashboard |
| Restricted Modules | Day-to-day mark entry, homework, timetable management (operational modules — view only) |
| Branch Scope | `all_branches` |
| Data Scope | `group` |

---

### 2.3 Group Academic Director *(new)*
| Field | Detail |
|-------|--------|
| Purpose | Standardize academics, curriculum, and exam practices across all branches |
| Responsibilities | Cross-branch syllabus review, exam pattern consistency, teacher performance review, academic policy |
| Reports To | Trustee |
| Accessible Modules | Academics, Timetable (view), Examinations, Study Material, Reports (academic), Homework (view), Attendance (view) |
| Restricted Modules | Fees, Payroll, Inventory, Transport, Hostel, HR |
| Branch Scope | `all_branches` |
| Data Scope | `school` (academic data only) |

---

### 2.4 Group Finance Controller *(new)*
| Field | Detail |
|-------|--------|
| Purpose | Consolidated financial control across all branches |
| Responsibilities | Payroll final release, inter-branch expense approval, P&L review, GST compliance, budget allocation |
| Reports To | Trustee |
| Accessible Modules | Fees (all), Payroll (all), Expenses (approve), Reports (financial), Inventory (view + approve high-value POs) |
| Restricted Modules | Student academic records, discipline, health |
| Branch Scope | `all_branches` |
| Data Scope | `group` |

---

### 2.5 Compliance Officer *(new)*
| Field | Detail |
|-------|--------|
| Purpose | Ensure DPDP, RTE, UDISE+, POSH, GST, and board-compliance obligations are met |
| Responsibilities | DPDP consent tracking, RTE quota verification, UDISE+ data review, POSH ICC workflow, board affiliation reports, audit log review |
| Reports To | Trustee / Principal |
| Accessible Modules | Audit Logs (full), Reports (compliance), Students (view PII fields — masked Aadhaar), Admissions (RTE), Settings (data privacy config), Communication (DLT template status) |
| Restricted Modules | Fees collection, mark entry, payroll disbursement, timetable |
| Branch Scope | `all_branches` |
| Data Scope | `school` (compliance data only) |

---

### 2.6 Principal
| Field | Detail |
|-------|--------|
| Purpose | Full operational authority over one branch |
| Responsibilities | Approve fee waivers, leave, mark corrections, TCs, expenses; review all academic and operational reports; manage staff |
| Reports To | Trustee |
| Accessible Modules | All modules (view + approve); Payroll (view + approve); Settings (branch-level); Role Management (branch staff roles) |
| Restricted Modules | SaaS global settings, inter-tenant data, other branch data |
| Branch Scope | `own_branch` |
| Data Scope | `school` |

---

### 2.7 Vice Principal
| Field | Detail |
|-------|--------|
| Purpose | Academic deputy; covers Principal in absence |
| Responsibilities | Timetable management, syllabus tracking, exam coordination oversight, teacher performance, substitute management |
| Reports To | Principal |
| Accessible Modules | Academics, Timetable, Examinations, Attendance (view all), Students (view), Reports (academic), Communication (notices), HR (view), Tasks |
| Restricted Modules | Payroll, Fee structure, Role Management, Settings, Inventory |
| Branch Scope | `own_branch` |
| Data Scope | `school` |

---

### 2.8 Academic Supervisor / Coordinator *(new)*
| Field | Detail |
|-------|--------|
| Purpose | Day-to-day academic monitoring — lesson plans, syllabus completion, CCE tracking |
| Responsibilities | Review teacher lesson plans, track syllabus %, coordinate CCE grades, HoD academic reporting |
| Reports To | Vice Principal |
| Accessible Modules | Academics, Timetable (view), Homework (view), Study Material (view), Examinations (view), Reports (academic), Attendance (view) |
| Restricted Modules | Finance, HR, Payroll, Settings, Role Management |
| Branch Scope | `own_branch` |
| Data Scope | `school` (academic only) |

---

### 2.9 Branch Admin *(new)*
| Field | Detail |
|-------|--------|
| Purpose | Administrative operations of one branch — non-academic delegation from Principal |
| Responsibilities | User management, role assignment, system settings, operational reports, vendor management coordination |
| Reports To | Principal |
| Accessible Modules | Settings (branch), Role Management (branch), Inventory, Transport (admin view), Hostel (admin view), Events, Tasks, Reports (operational), Audit Logs (view) |
| Restricted Modules | Mark entry, lesson plans, payroll release |
| Branch Scope | `own_branch` |
| Data Scope | `school` |

---

### 2.10 HoD (Head of Department)
| Field | Detail |
|-------|--------|
| Purpose | Academic and personnel authority over one department (e.g., Science, Commerce) |
| Responsibilities | Subject allocation, teacher timetable review, mark verification and lock, syllabus review, leave recommendation for department staff |
| Reports To | Vice Principal / Principal |
| Accessible Modules | Academics (dept), Timetable (dept), Examinations (dept — verify marks), Homework (dept), Study Material (dept), Attendance (dept view), Reports (dept), HR (dept — leave approval) |
| Restricted Modules | Finance, Payroll, Inventory, Settings, Role Management |
| Branch Scope | `own_branch` |
| Data Scope | `department` |

---

### 2.11 Exam Coordinator *(new)*
| Field | Detail |
|-------|--------|
| Purpose | End-to-end exam operations: scheduling, seating, mark collection, result publication |
| Responsibilities | Create exam schedule, assign invigilators, configure grading patterns, lock/unlock marks, generate report cards |
| Reports To | Vice Principal |
| Accessible Modules | Examinations (full CRUD + approve), Timetable (exam timetable), Students (view), Reports (exam), Communication (date sheet publish), Certificates (report card trigger) |
| Restricted Modules | Fee collection, Payroll, HR, Inventory, Settings |
| Branch Scope | `own_branch` |
| Data Scope | `school` (all divisions) |

---

### 2.12 Admission Head / Admission Officer
| Field | Detail |
|-------|--------|
| Purpose | Manage the complete enquiry-to-admission pipeline |
| Responsibilities | Enquiry capture, counsellor assignment, admission form, document checklist, RTE workflow, merit list, fee quotation |
| Reports To | Principal |
| Accessible Modules | Admissions (full), Students (create on admission), Fees (fee structure view + quotation), Communication (bulk admission SMS), Certificates (admission letter), Reports (admission) |
| Restricted Modules | Mark entry, Payroll, HR, Inventory, Transport (no edit), Hostel (no edit) |
| Branch Scope | `own_branch` |
| Data Scope | `school` (admission pipeline) |

---

### 2.13 Class Teacher
| Field | Detail |
|-------|--------|
| Purpose | Primary point of contact for one Standard-Division |
| Responsibilities | Daily attendance, discipline log, parent communication, homework coordination, report card remarks, leave application review |
| Reports To | HoD / VP |
| Accessible Modules | Attendance (own division — full), Students (own division — limited edit), Homework (own division view), Communication (own division), Examinations (view marks own division), Certificates (initiate TC), Events (view), Tasks (assigned) |
| Restricted Modules | Finance, Payroll, HR, Inventory, Settings, Role Management, Transport (view only) |
| Branch Scope | `own_branch` |
| Data Scope | `division` (own assigned class) |

---

### 2.14 Subject Teacher / Faculty
| Field | Detail |
|-------|--------|
| Purpose | Teaching, content delivery, and assessment for assigned subjects |
| Responsibilities | Lesson plans, classwork, homework, marks entry, study material upload, online tests |
| Reports To | HoD |
| Accessible Modules | Academics (own subjects), Homework (own subjects), Study Material (own subjects), Examinations (own subjects — mark entry), Timetable (view own), Attendance (period-wise own classes), Communication (subject announcements) |
| Restricted Modules | Finance, Payroll, HR, Inventory, Settings, Role Management, Admissions |
| Branch Scope | `own_branch` |
| Data Scope | `own` (assigned subjects and divisions) |

---

### 2.15 Accountant / Senior Accountant
| Field | Detail |
|-------|--------|
| Purpose | Financial operations: fee collection, payroll preparation, expense management, GST |
| Responsibilities | Fee collection, receipts, defaulter follow-up, payroll preparation (maker), expense voucher entry, GST reports, bank reconciliation |
| Reports To | Finance Controller / Principal |
| Accessible Modules | Fees (full), Payroll (prepare + view), Expenses (full), Reports (financial), Inventory (purchase orders — view), Students (fee view), Communication (fee reminders) |
| Restricted Modules | Mark entry, Timetable, Homework, Study Material, Discipline, Health |
| Branch Scope | `own_branch` |
| Data Scope | `school` (financial data) |

---

### 2.16 Cashier *(sub-role of Accountant)*
| Field | Detail |
|-------|--------|
| Purpose | Counter fee collection only |
| Responsibilities | Collect fees (cash/UPI), generate receipts, daily cash register |
| Reports To | Accountant |
| Accessible Modules | Fees (collect + receipt only — no structure edit, no waiver), Students (view fee status only) |
| Restricted Modules | Payroll, Expenses, Reports (export), all academic modules |
| Branch Scope | `own_branch` |
| Data Scope | `own` (transactions entered by self) |

---

### 2.17 HR Manager
| Field | Detail |
|-------|--------|
| Purpose | Staff lifecycle management: records, leaves, payroll prep, appraisals, recruitment |
| Responsibilities | Staff records, leave approvals, payroll structure, Form 16, recruitment, onboarding |
| Reports To | Principal / Finance Controller |
| Accessible Modules | HR (full), Payroll (prepare + structure), Staff Attendance, Reports (HR), Communication (staff notices), Tasks (HR tasks) |
| Restricted Modules | Student academic records, Fee collection, Inventory, Transport (no edit) |
| Branch Scope | `own_branch` |
| Data Scope | `school` (staff only) |

---

### 2.18 Librarian
| Field | Detail |
|-------|--------|
| Purpose | Manage the school library — physical and digital |
| Responsibilities | Catalogue management, book issue/return, fine collection, digital library, reading register |
| Reports To | Principal / VP |
| Accessible Modules | Library (full), Students (view — borrowing info only), Communication (library notices), Reports (library) |
| Restricted Modules | Finance, HR, Payroll, Timetable, Examinations, Inventory (general — library stock is separate) |
| Branch Scope | `own_branch` |
| Data Scope | `school` (library data) |

---

### 2.19 Transport Manager / In-charge
| Field | Detail |
|-------|--------|
| Purpose | Safe and efficient student transport operations |
| Responsibilities | Route/stop management, vehicle records, driver/conductor management, student allocation, GPS oversight, maintenance logs |
| Reports To | Branch Admin / Principal |
| Accessible Modules | Transport (full), Students (view — transport allocation), Communication (transport alerts), Reports (transport), Expenses (transport expenses — view) |
| Restricted Modules | Finance (no fee structure), Mark entry, Payroll, HR, Inventory (general) |
| Branch Scope | `own_branch` |
| Data Scope | `school` (transport data) |

---

### 2.20 Hostel Warden / Chief Warden
| Field | Detail |
|-------|--------|
| Purpose | Residential student management |
| Responsibilities | Room allocation, hostel attendance, leave/gate pass, mess coordination, incident log, visitor register |
| Reports To | Branch Admin / Principal |
| Accessible Modules | Hostel (full), Students (view — hostel profile), Communication (hostel notices), Reports (hostel), Expenses (hostel — view) |
| Restricted Modules | Academic marks, Fee structure, Payroll, HR, Timetable |
| Branch Scope | `own_branch` |
| Data Scope | `school` (hostel residents only) |

---

### 2.21 Counsellor *(new)*
| Field | Detail |
|-------|--------|
| Purpose | Student mental health, career guidance, and POSH support |
| Responsibilities | Confidential sessions, parent meeting logs, referrals, POSH anonymous reports (ICC member), career counselling |
| Reports To | Discipline Coordinator / VP |
| Accessible Modules | Students (view — limited: name, class, health notes), Discipline (view + add counsellor notes — private), Health (view + add mental health notes), Communication (individual parent — private) |
| Restricted Modules | Fees, Payroll, Marks, Inventory, HR, Timetable, Reports (general) |
| Branch Scope | `own_branch` |
| Data Scope | `own` (assigned sessions only; POSH reports = ICC access only) |

---

### 2.22 Discipline Coordinator *(new)*
| Field | Detail |
|-------|--------|
| Purpose | Behaviour management, anti-bullying, POSH compliance |
| Responsibilities | Incident log management, suspension workflow, counsellor coordination, parent meeting, POSH ICC coordination |
| Reports To | VP / Principal |
| Accessible Modules | Discipline (full), Students (view + behaviour edit), Communication (parent notices), Tasks (disciplinary tasks), Reports (behaviour) |
| Restricted Modules | Fees, Payroll, HR, Inventory, Timetable, Marks |
| Branch Scope | `own_branch` |
| Data Scope | `school` |

---

### 2.23 School Nurse / Health Officer *(new)*
| Field | Detail |
|-------|--------|
| Purpose | Student and staff health monitoring |
| Responsibilities | Annual check-ups, clinic visit log, vaccination records, allergy/condition updates, first-aid, referrals |
| Reports To | Principal |
| Accessible Modules | Health (full), Students (view — health profile only), Reports (health), Communication (health alerts) |
| Restricted Modules | Marks, Fees, Payroll, HR, Timetable, Discipline (view only), Inventory (medical supplies — request only) |
| Branch Scope | `own_branch` |
| Data Scope | `school` (health data only) |

---

### 2.24 Store Manager *(new)*
| Field | Detail |
|-------|--------|
| Purpose | Physical stock, assets, procurement, and vendor management |
| Responsibilities | Stock-in/out, indent approval, vendor master, asset register, re-order alerts, purchase orders |
| Reports To | Accountant / Principal |
| Accessible Modules | Inventory (full), Expenses (purchase voucher — create), Reports (inventory), Tasks (stock tasks) |
| Restricted Modules | Fees, Payroll, HR, Student academic records, Timetable |
| Branch Scope | `own_branch` |
| Data Scope | `school` (inventory data) |

---

### 2.25 Event Coordinator *(new)*
| Field | Detail |
|-------|--------|
| Purpose | Plan and execute school events, photo gallery, and participation certificates |
| Responsibilities | Annual Day, Sports Day, Cultural Fest, online registration, e-tickets, certificates, photo gallery |
| Reports To | VP / Principal |
| Accessible Modules | Events (full), Certificates (participation + merit), Communication (event notices + bulk), Gallery (upload + manage), Students (view — participation list) |
| Restricted Modules | Fees (no collection), Payroll, HR, Marks, Inventory (request only) |
| Branch Scope | `own_branch` |
| Data Scope | `school` |

---

### 2.26 Reception Manager *(new)*
| Field | Detail |
|-------|--------|
| Purpose | Supervise front-office operations and receptionist team |
| Responsibilities | Visitor management oversight, phone log, enquiry routing, lost & found, OTP dispatch management |
| Reports To | Branch Admin / Principal |
| Accessible Modules | Visitor Management (full), Admissions (enquiry log — view + create), Communication (front-office notices), Students (view — for dispatch verification), Reports (visitor) |
| Restricted Modules | Fees, Payroll, Marks, HR, Inventory, Settings |
| Branch Scope | `own_branch` |
| Data Scope | `school` |

---

### 2.27 IT Administrator *(new)*
| Field | Detail |
|-------|--------|
| Purpose | System configuration, integrations, user accounts, and data security |
| Responsibilities | User account provisioning, role assignment (non-sensitive), SMS/WhatsApp/GPS/biometric integrations, backups, system health |
| Reports To | Branch Admin / Principal |
| Accessible Modules | Settings (full), Role Management (view + assign pre-defined roles), Audit Logs (view), Reports (system), Communication (integration config) |
| Restricted Modules | Student PII export, Payroll, Fee structure modification, Mark corrections |
| Branch Scope | `own_branch` |
| Data Scope | `school` (system/config data) |
| Special note | Cannot assign Super Admin, Trustee, or Finance Controller roles — only Principal can |

---

### 2.28 Receptionist
| Field | Detail |
|-------|--------|
| Purpose | Front-desk operations |
| Responsibilities | Visitor entry, gate pass printing, phone log, enquiry capture, OTP dispatch, courier log |
| Reports To | Reception Manager |
| Accessible Modules | Visitor Management (full), Admissions (enquiry — create only), Students (view name/photo/class — dispatch only), Communication (send individual messages) |
| Restricted Modules | All academic, finance, HR modules |
| Branch Scope | `own_branch` |
| Data Scope | `own` (own entries) |

---

### 2.29 Driver / Conductor
| Field | Detail |
|-------|--------|
| Purpose | Safe student transport execution |
| Responsibilities | Route start/stop, boarding scan, SOS alert, fuel log |
| Reports To | Transport Manager |
| Accessible Modules | Transport (driver app — own route only: start/stop, boarding, SOS, fuel entry) |
| Restricted Modules | All other modules |
| Branch Scope | `own_branch` |
| Data Scope | `own` (assigned route only) |

---

### 2.30 MDM Coordinator *(new — Govt/Aided only)*
| Field | Detail |
|-------|--------|
| Purpose | Mid-Day Meal / PM POSHAN scheme management |
| Responsibilities | Daily beneficiary count, consumption register, vendor payment records, state reports |
| Reports To | Principal |
| Accessible Modules | Meal Planner (full), Reports (MDM), Students (view — beneficiary list), Inventory (kitchen stock), Expenses (MDM expenses) |
| Restricted Modules | Fee collection, Payroll, HR, Marks, Timetable |
| Branch Scope | `own_branch` |
| Data Scope | `school` (MDM data only) |

---

### 2.31 RTE Officer *(new — Govt/Aided track)*
| Field | Detail |
|-------|--------|
| Purpose | RTE 25% quota compliance and state reimbursement |
| Responsibilities | RTE seat tracking, fee exemption verification, state report generation, income certificate validation |
| Reports To | Principal / Compliance Officer |
| Accessible Modules | Admissions (RTE workflow — full), Students (RTE students — view), Fees (RTE exemption — view + approve), Reports (RTE) |
| Restricted Modules | General fee collection, Payroll, HR, Marks, Inventory |
| Branch Scope | `own_branch` |
| Data Scope | `school` (RTE students only) |

---

### 2.32 Parent / Guardian
| Field | Detail |
|-------|--------|
| Purpose | Monitor child's academic and school life |
| Responsibilities | View attendance/homework/marks/fees, apply leave, make fee payments, chat with teacher, track transport |
| Reports To | — |
| Accessible Modules | Students (own children only — view), Attendance (own children — view), Homework (view), Fees (view + pay), Examinations (view results), Communication (receive + reply), Transport (track live) |
| Restricted Modules | All staff modules, other students' data |
| Branch Scope | `own_branch` (child's branch) |
| Data Scope | `own_children` |

---

### 2.33 Student
| Field | Detail |
|-------|--------|
| Purpose | Access personal academic resources |
| Responsibilities | View timetable, submit homework, access study material, take MCQ tests, view marks |
| Reports To | — |
| Accessible Modules | Timetable (own), Homework (own — view + submit), Study Material (own class), Examinations (own results), Library (borrow status), Events (view), Communication (receive notices) |
| Restricted Modules | All staff modules, other students' data, fees (view summary only — no payment by minor) |
| Branch Scope | `own_branch` |
| Data Scope | `own` |

---

### 2.34 Alumni
| Field | Detail |
|-------|--------|
| Purpose | Stay connected with school |
| Responsibilities | Directory, events, donations, mentorship for current students |
| Reports To | — |
| Accessible Modules | Alumni (full — own profile), Events (alumni events), Communication (alumni channel) |
| Restricted Modules | All current student data, staff data, financial data |
| Branch Scope | `own_branch` (alumni branch) |
| Data Scope | `own` + `historical_read` (own records) |

---

## Section 3 — Module Permission Matrix

**Action Codes:**
- `Y` = Yes (full access within scope)
- `V` = View only
- `N` = No access (hidden)
- `O` = Own data only
- `D` = Department scope
- `A` = Approve only
- `R` = Request / Initiate only (no direct action)

### Group A — Platform & Leadership Roles

| Module | SaaS SuperAdmin | Trustee | Grp Finance Controller | Grp Academic Director | Compliance Officer |
|--------|:-:|:-:|:-:|:-:|:-:|
| Admissions | V | V | N | V | V (RTE) |
| Students | N (PII blocked) | V | N | V | V (compliance fields) |
| Attendance | N | V | N | V | V |
| Academics | N | V | N | Y | V |
| Timetable | N | V | N | V | N |
| Examinations | N | V | N | Y | V |
| Homework | N | N | N | V | N |
| Study Material | N | N | N | V | N |
| Communication | Y (system) | V | N | V | V (DLT status) |
| Fees | N | Y (approve waivers) | Y (all) | N | V |
| Payroll | N | V | Y (release) | N | V |
| HR | N | V | V | N | V |
| Transport | N | V | N | N | N |
| Hostel | N | V | N | N | N |
| Library | N | V | N | N | N |
| Inventory | N | V | Y (high-value PO) | N | N |
| Expenses | N | Y (large approve) | Y (all) | N | V |
| Certificates | N | N | N | N | N |
| Events | N | V | N | N | N |
| Visitor Management | N | N | N | N | N |
| Tasks | N | N | N | N | N |
| Reports | Y (system) | Y (financial+academic) | Y (financial) | Y (academic) | Y (compliance) |
| Settings | Y (global) | V | N | N | Y (privacy config) |
| Role Management | Y (global) | N | N | N | N |
| Audit Logs | Y (all) | V | V | N | Y (all) |

---

### Group B — Branch Leadership

| Module | Principal | Vice Principal | Academic Supervisor | Branch Admin |
|--------|:-:|:-:|:-:|:-:|
| Admissions | Y | V | V | V |
| Students | Y | V | V | Y |
| Attendance | Y | Y | V | V |
| Academics | Y | Y | Y | N |
| Timetable | Y | Y | V | N |
| Examinations | Y (approve) | Y | V | N |
| Homework | V | V | Y | N |
| Study Material | V | V | Y | N |
| Communication | Y | Y | V | Y |
| Fees | Y (approve) | N | N | V |
| Payroll | Y (approve) | N | N | N |
| HR | Y | V | N | V |
| Transport | Y | V | N | Y |
| Hostel | Y | V | N | Y |
| Library | Y | V | N | V |
| Inventory | Y (approve) | N | N | Y |
| Expenses | Y (approve) | N | N | V |
| Certificates | Y (issue TC) | V | N | N |
| Events | Y | Y | V | Y |
| Visitor Management | Y | V | N | Y |
| Tasks | Y | Y | V | Y |
| Reports | Y (all) | Y (academic) | Y (academic) | Y (operational) |
| Settings | Y (branch) | N | N | Y (branch) |
| Role Management | Y (branch) | N | N | Y (branch) |
| Audit Logs | Y (view) | N | N | Y (view) |

---

### Group C — Academic & Exam Roles

| Module | HoD | Exam Coordinator | Class Teacher | Subject Teacher |
|--------|:-:|:-:|:-:|:-:|
| Admissions | N | N | N | N |
| Students | V (dept) | V | V (own div) | V (own classes) |
| Attendance | V (dept) | N | Y (own div) | V (period — own) |
| Academics | Y (dept) | V | V | Y (own subjects) |
| Timetable | V (dept) | Y (exam) | V | V (own) |
| Examinations | Y (dept — verify) | Y (all) | V (own div) | Y (own — marks entry) |
| Homework | Y (dept — view) | N | V | Y (own) |
| Study Material | Y (dept) | N | V | Y (own) |
| Communication | Y (dept) | Y (exam alerts) | Y (own div) | O (own classes) |
| Fees | N | N | V (defaulters list) | N |
| Payroll | N | N | N | N |
| HR | V (dept — leave) | N | N | N |
| Transport | N | N | V | N |
| Hostel | N | N | V | N |
| Library | N | N | V | N |
| Inventory | R (dept indent) | R | N | N |
| Expenses | N | N | N | N |
| Certificates | N | Y (report cards) | R (initiate TC) | N |
| Events | V | V | V | V |
| Visitor Management | N | N | N | N |
| Tasks | Y (dept) | Y | Y | Y (own) |
| Reports | Y (dept) | Y (exam) | O (own div) | O (own) |
| Settings | N | N | N | N |
| Role Management | N | N | N | N |
| Audit Logs | N | N | N | N |

---

### Group D — Finance, HR & Operations

| Module | Accountant | Cashier | HR Manager | Store Manager | Transport Mgr | Hostel Warden | Librarian |
|--------|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| Admissions | N | N | N | N | N | N | N |
| Students | V (fee status) | V (fee status) | V (staff only) | N | V (transport) | V (hostel) | V (library) |
| Attendance | N | N | Y (staff) | N | N | Y (hostel) | N |
| Academics | N | N | N | N | N | N | N |
| Timetable | N | N | N | N | N | N | N |
| Examinations | N | N | N | N | N | N | N |
| Homework | N | N | N | N | N | N | N |
| Study Material | N | N | N | N | N | N | N |
| Communication | Y (fee alerts) | N | Y (staff notices) | N | Y (transport) | Y (hostel notices) | Y (library notices) |
| Fees | Y | Y (collect only) | N | N | N | Y (hostel fees view) | N |
| Payroll | Y (prepare) | N | Y (structure+prep) | N | N | N | N |
| HR | V | N | Y | N | N | N | N |
| Transport | V | N | N | N | Y | N | N |
| Hostel | V | N | N | N | N | Y | N |
| Library | N | N | N | N | N | N | Y |
| Inventory | Y (purchase — view) | N | N | Y | V | N | N |
| Expenses | Y | N | N | Y (create voucher) | V | V | N |
| Certificates | N | N | N | N | N | N | N |
| Events | N | N | N | N | N | N | N |
| Visitor Management | N | N | N | N | N | Y (hostel visitors) | N |
| Tasks | N | N | Y | Y | Y | Y | N |
| Reports | Y (financial) | N | Y (HR) | Y (inventory) | Y (transport) | Y (hostel) | Y (library) |
| Settings | N | N | N | N | N | N | N |
| Role Management | N | N | N | N | N | N | N |
| Audit Logs | N | N | N | N | N | N | N |

---

### Group E — Support & Coordinator Roles

| Module | Counsellor | Discipline Coord | School Nurse | Event Coord | Reception Mgr | Receptionist | IT Admin |
|--------|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| Admissions | N | N | N | N | V (enquiry) | Y (enquiry-create) | N |
| Students | V (limited) | V+edit (behaviour) | V (health profile) | V (participation) | V (dispatch only) | V (name/class) | N |
| Attendance | N | V | N | N | N | N | N |
| Academics | N | N | N | N | N | N | N |
| Timetable | N | N | N | N | N | N | N |
| Examinations | N | N | N | N | N | N | N |
| Homework | N | N | N | N | N | N | N |
| Study Material | N | N | N | N | N | N | N |
| Communication | O (private) | Y (notices) | Y (health alerts) | Y (event) | Y (front-office) | O (individual) | Y (system) |
| Fees | N | N | N | N | N | N | N |
| Payroll | N | N | N | N | N | N | N |
| HR | N | N | V (own leave) | N | N | N | N |
| Transport | N | N | N | N | N | N | N |
| Hostel | N | N | N | N | N | N | N |
| Library | N | N | N | N | N | N | N |
| Inventory | N | N | R (medical) | R | N | N | V |
| Expenses | N | N | N | V | N | N | N |
| Certificates | N | N | N | Y (participation) | N | N | N |
| Events | N | N | N | Y | N | N | N |
| Visitor Management | N | N | N | N | Y | Y | N |
| Tasks | N | Y | N | Y | Y | O | N |
| Reports | N | Y (behaviour) | Y (health) | Y (events) | Y (visitor) | N | Y (system) |
| Settings | N | N | N | N | N | N | Y |
| Role Management | N | N | N | N | N | N | Y (assign only) |
| Audit Logs | N | N | N | N | N | N | Y (view) |

---

### Group F — External / Portal Users

| Module | Parent | Student | Alumni | Driver |
|--------|:-:|:-:|:-:|:-:|
| Admissions | N | N | N | N |
| Students | O (own children) | O (own profile) | O (own alumni profile) | N |
| Attendance | O (own children — view) | O (own — view) | N | N |
| Academics | N | O (own class — view) | N | N |
| Timetable | O (own children — view) | O (own — view) | N | N |
| Examinations | O (own children results) | O (own results) | N | N |
| Homework | O (own children — view) | O (own — view+submit) | N | N |
| Study Material | N | O (own class — view) | N | N |
| Communication | O (receive+reply) | O (receive) | O (alumni channel) | N |
| Fees | O (own children — view+pay) | N | N | N |
| Payroll | N | N | N | N |
| HR | N | N | N | N |
| Transport | O (track own children) | N | N | O (own route — driver app) |
| Hostel | N | O (own room — view) | N | N |
| Library | N | O (own borrowing) | N | N |
| Inventory | N | N | N | N |
| Expenses | N | N | N | N |
| Certificates | O (view/download own) | O (view/download own) | O (alumni) | N |
| Events | O (view + register) | O (view + register) | O (alumni events) | N |
| Visitor Management | N | N | N | N |
| Tasks | N | N | N | N |
| Reports | N | N | N | N |
| Settings | O (own profile + language) | O (own profile) | O (own profile) | N |
| Role Management | N | N | N | N |
| Audit Logs | N | N | N | N |

---

## Section 4 — Sidebar Design per Role

### 4.1 SaaS Super Admin
**Dashboard Widgets:** Active tenants, subscription health, system uptime, revenue MRR, support tickets  
**Sidebar:**
- Tenants (list, provision, suspend)
- Subscription Plans
- System Settings
- Audit Logs (system)
- Reports (SaaS analytics)
- Support

**Hidden:** All school-specific modules  
**Quick Actions:** Provision tenant, upgrade plan, broadcast announcement  
**Notifications:** Tenant payment failures, system errors, support escalations

---

### 4.2 Trustee / School Owner
**Dashboard Widgets:** Total students (all branches), fee collected (this month), expense burn, staff strength, branch comparison, profitability by branch  
**Sidebar:**
- Dashboard (group overview)
- Reports
  - Financial
  - Academic
  - Admissions
  - Branch Comparison
- Fees (approve waivers)
- Payroll (view)
- Expenses (approve)
- Audit Logs (view)

**Hidden:** Mark entry, Homework, Timetable management, Inventory, Driver route, Visitor  
**Quick Actions:** Approve pending waivers, view P&L, download monthly report  
**Notifications:** High-value approval requests, branch milestone alerts, compliance flags

---

### 4.3 Principal
**Dashboard Widgets:** Today's attendance %, fee collected today, pending approvals count, staff present, long-absent students, exam results summary, pending TCs  
**Sidebar:**
- Dashboard
- Academics
  - Academic Structure
  - Timetable
  - Examinations
  - Homework (overview)
  - Study Material (overview)
- Students
- Admissions
- Attendance
- Fees (approve)
- Payroll (approve)
- HR
- Transport
- Hostel
- Library
- Inventory (approve)
- Expenses (approve)
- Communication
- Certificates
- Events
- Visitor Management
- Reports
- Settings (branch)
- Role Management (branch)
- Audit Logs

**Hidden:** SaaS settings, other branch data  
**Quick Actions:** Approve leave, approve fee concession, publish notice, issue TC  
**Notifications:** Pending approvals, long-absence alerts, bounced cheques, POSH reports, inventory re-order alerts

---

### 4.4 Vice Principal
**Dashboard Widgets:** Syllabus completion %, pending timetable substitutions, teacher attendance today, exam schedule upcoming, pending mark entries  
**Sidebar:**
- Dashboard
- Academics
  - Structure
  - Timetable (+ substitution)
  - Lesson Plans review
- Students (view)
- Attendance (all — view)
- Examinations
- Homework (view)
- Study Material (view)
- Communication (notices)
- HR (view — leaves)
- Reports (academic)
- Tasks

**Hidden:** Fees, Payroll, Inventory, Settings, Role Management, Audit Logs  
**Quick Actions:** Assign substitute, publish notice, review lesson plan  
**Notifications:** Teacher absent → substitution needed, syllabus lag alerts, exam date conflicts

---

### 4.5 HoD
**Dashboard Widgets:** Dept syllabus %, dept teacher performance, pending marks verification, dept attendance, this week's tests  
**Sidebar:**
- Dashboard (dept)
- Academics (dept)
  - Subjects
  - Syllabus tracking
  - Lesson Plans
- Timetable (dept — view)
- Examinations (dept — verify)
- Homework (dept)
- Study Material (dept)
- Attendance (dept — view)
- Students (dept — view)
- Communication (dept)
- HR (dept — leave recommend)
- Reports (dept)
- Tasks (dept)

**Hidden:** Fees, Payroll, Inventory, Transport, Hostel, Settings, Role Management  
**Quick Actions:** Verify marks, review lesson plan, send dept notice  
**Notifications:** Marks awaiting verification, syllabus lag, teacher leave requests

---

### 4.6 Exam Coordinator
**Dashboard Widgets:** Upcoming exams, marks entry pending (by subject/teacher), report cards ready to publish, failed validations  
**Sidebar:**
- Dashboard (exam ops)
- Examinations
  - Exam Setup
  - Date Sheet
  - Seating Arrangement
  - Marks Entry (oversight)
  - Mark Verification
  - Report Cards
  - Online MCQ Tests
  - Question Bank
- Timetable (exam — edit)
- Students (view)
- Communication (date sheet publish)
- Certificates (report card trigger)
- Reports (exam analysis)
- Tasks

**Hidden:** Fees, Payroll, HR, Inventory, Settings, Admissions  
**Quick Actions:** Lock marks, publish report cards, send date sheet  
**Notifications:** Marks entry pending, re-evaluation requests, report card delivery status

---

### 4.7 Class Teacher
**Dashboard Widgets:** Today's attendance (my class), homework submitted %, parent messages unread, defaulter fee students in my class, upcoming PTM  
**Sidebar:**
- Dashboard (my class)
- Attendance (my class)
- My Students
- Homework (my class)
- Classwork
- Communication
  - Parent Chat
  - Class Notices
- Examinations (results — my class)
- Certificates (initiate TC, Bonafide)
- Events (view)
- Tasks (assigned to me)
- Reports (my class)

**Hidden:** Fees, Payroll, HR, Inventory, Timetable management, Settings, Role Management, Audit Logs  
**Quick Actions:** Mark attendance, post homework, send parent message, apply for leave  
**Notifications:** Parent leave requests, parent messages, substitution assigned, PTM reminders

---

### 4.8 Subject Teacher
**Dashboard Widgets:** Today's periods, pending homework reviews, marks entry pending, syllabus coverage %, weak student alerts  
**Sidebar:**
- Dashboard (my subjects)
- Academics (my subjects)
  - Lesson Plan
  - Syllabus
- Classwork (my classes)
- Homework (my classes)
- Study Material (my subjects)
- Examinations (my subjects — marks entry)
- Attendance (period-wise — my classes)
- Communication (class announcements)
- Tasks (assigned to me)
- Reports (my subjects)

**Hidden:** Fees, Payroll, HR, Inventory, Admissions, Settings, Role Management  
**Quick Actions:** Post classwork, post homework, enter marks  
**Notifications:** Homework due reminders, marks lock deadline, substitution assigned

---

### 4.9 Admission Officer / Head
**Dashboard Widgets:** Enquiries today, enquiry pipeline (Kanban status), admissions confirmed this month, RTE seats remaining, conversion %  
**Sidebar:**
- Dashboard (admissions)
- Admissions
  - Enquiry Management
  - Admission Forms
  - Document Checklist
  - RTE Workflow
  - Merit List
  - Admission Letters
- Students (create on confirm)
- Fees (quotation view)
- Communication (admission SMS/WhatsApp)
- Certificates (admission letter)
- Reports (admission analytics)
- Tasks

**Hidden:** Marks, Payroll, HR, Inventory, Timetable, Settings, Role Management  
**Quick Actions:** Log enquiry, schedule entrance test, confirm admission, send prospectus  
**Notifications:** New online enquiries, document upload by applicant, follow-up due today

---

### 4.10 Accountant
**Dashboard Widgets:** Fee collected today, pending payments, defaulter count, today's expenses, payroll processing status, bank balance (linked)  
**Sidebar:**
- Dashboard (financial)
- Fees
  - Collection
  - Fee Structure
  - Concessions (review)
  - Defaulters
  - Receipts
  - GST Reports
  - Bank Reconciliation
- Payroll
  - Salary Structure
  - Monthly Processing
  - Bank Transfer File
  - Form 16
- Expenses
  - Voucher Entry
  - Petty Cash
  - Expense Reports
- Inventory (purchase vouchers — view)
- Communication (fee reminders)
- Reports (financial)
- Tasks

**Hidden:** Marks, Timetable, Homework, Study Material, Discipline, Health, Role Management  
**Quick Actions:** Collect fee, generate receipt, process payroll, send payment reminder  
**Notifications:** Bounced cheques, payroll approval pending, high-value expense approval needed, GST due date

---

### 4.11 HR Manager
**Dashboard Widgets:** Staff attendance today, leave requests pending, payroll month status, open positions, appraisal cycle status  
**Sidebar:**
- Dashboard (HR)
- HR
  - Staff Records
  - Leave Management
  - Leave Balances
  - Attendance (staff)
  - Appraisals
  - Recruitment
  - Onboarding
- Payroll
  - Structure
  - Monthly prep
- Communication (staff notices)
- Reports (HR)
- Tasks

**Hidden:** Student academic data, Fee collection, Inventory, Transport, Hostel, Settings  
**Quick Actions:** Approve leave, process new joinee, send payslip  
**Notifications:** Pending leave requests, payroll due, document expiry alerts (police verification, license)

---

### 4.12 Librarian
**Dashboard Widgets:** Books issued today, overdue returns, fine collected, popular books, new arrivals  
**Sidebar:**
- Dashboard (library)
- Library
  - Catalogue
  - Issue / Return
  - Reservations
  - Fines
  - Member Accounts
  - Digital Library
  - Reading Register
- Communication (library notices)
- Reports (library)

**Hidden:** All other modules  
**Quick Actions:** Issue book, return book, search catalogue  
**Notifications:** Overdue alerts, book reservation queue, new e-book added

---

### 4.13 Transport Manager
**Dashboard Widgets:** Live bus locations, buses on route today, vehicles with expiring docs, morning route status, student boarding count  
**Sidebar:**
- Dashboard (transport)
- Transport
  - Routes
  - Stops
  - Vehicles
  - Drivers & Conductors
  - Student Allocation
  - GPS Tracking
  - Maintenance Log
  - Fuel Log
- Communication (transport alerts)
- Reports (transport)
- Tasks

**Hidden:** Academic, Finance, HR, Hostel, Library modules  
**Quick Actions:** Start route, send ETA alert, log vehicle maintenance  
**Notifications:** Bus delayed alert, SOS from driver, vehicle doc expiry, student not boarded

---

### 4.14 Hostel Warden
**Dashboard Widgets:** Boarders present tonight, leave applications pending, room occupancy, mess attendance today, incidents this week  
**Sidebar:**
- Dashboard (hostel)
- Hostel
  - Room Allocation
  - Boarder Attendance
  - Leave / Gate Pass
  - Visitor Register
  - Incident Log
- Meal Planner
  - Weekly Menu
  - Mess Attendance
- Communication (hostel notices)
- Reports (hostel)
- Tasks

**Hidden:** Academic marks, Fees, Payroll, HR, Timetable, Inventory (general)  
**Quick Actions:** Mark hostel attendance, approve leave, log incident  
**Notifications:** Leave applications, unexpected absence, mess special request, parent visitor arrival

---

### 4.15 Receptionist
**Dashboard Widgets (minimal):** Visitors inside now, pending gate passes, today's expected visitors  
**Sidebar:**
- Visitor Management
  - Visitor Entry
  - Gate Pass
  - Pre-approved List
  - Phone Log
  - Courier Register
  - Lost & Found
- Admissions (enquiry form only)
- Communication (receive only)

**Hidden:** All academic, finance, HR, student-detail modules  
**Quick Actions:** Log visitor, print gate pass, log call  
**Notifications:** OTP dispatch alerts, expected VIP visitor, unidentified pickup attempt

---

### 4.16 Driver
**Mobile App — Bottom Nav only:**
- My Route (start/stop)
- Student Boarding (scan)
- SOS Button
- Fuel Log

**Hidden:** Everything else  
**Quick Actions:** Start route, SOS  
**Notifications:** Route assigned, schedule change, emergency school alert

---

### 4.17 Parent
**Mobile App — Bottom Nav:**
- Today (attendance, homework, classwork, fees due, notices)
- Children switcher (multi-child)
- Fee Payment
- Chat (class/subject teacher)
- Bus Tracker

**Hidden:** All staff and management modules  
**Quick Actions:** Pay fee, apply leave, track bus, request meeting  
**Notifications:** Absent alert, homework posted, fee due, exam results published, bus approaching stop

---

### 4.18 Student
**Mobile App — Bottom Nav:**
- Home (timetable, today's homework, notices)
- Study Material
- MCQ / Tests
- Marks & Results
- Library Status

**Hidden:** All staff, management, parent modules  
**Quick Actions:** Submit homework, take MCQ test, view timetable  
**Notifications:** Homework due reminder, exam countdown, new study material uploaded, result published

---

## Section 5 — Approval Workflows

### 5.1 Fee Concession Workflow

```
Initiator: Class Teacher / Admission Officer
    ↓ (submit request with reason, supporting docs)
Reviewer: Accountant (verify fee ledger, % calculation)
    ↓
Approver: Principal (up to 25% concession)
    ↓ (if > 25% or RTE-linked)
Final Approver: Trustee / Finance Controller
    ↓ (if approved)
Action: Accountant applies concession; system auto-generates revised fee schedule
    ↓
Notification: Parent via SMS + App
    ↓
Audit: Logged with initiator, approver, % granted, reason, timestamp
```

**SLA:** Principal response within 2 working days; Trustee within 5  
**Rejection:** Returns to initiator with remarks; can be revised and re-submitted  
**RTE:** Auto-tracked; no approval needed for state-notified 25% exemption  
**Sibling discount:** Auto-applied if rules match; no workflow needed unless above defined slab

---

### 5.2 Staff Leave Request Workflow

```
Initiator: Any Staff Member (self-service in app)
    ↓
Reviewer: Reporting Officer / Class Teacher's HoD (for teaching staff)
    ↓ (EL/ML require HR verification of balance)
HR Manager: Verify leave balance, calculate LOP if needed
    ↓
Approver: Principal (final for all leave types)
    ↓ (if approved)
System: Updates attendance, triggers substitute for teachers, links to payroll (LOP)
    ↓
Notification: Staff + substitute teacher (if applicable)
    ↓
Audit: Leave record logged; payroll impact calculated
```

**SLA:** Reporting Officer: 1 day; HR: 1 day; Principal: 1 day  
**ML/Maternity:** HR + Principal + document verification; no rejection permitted under Maternity Benefit Act  
**Comp-off:** Requires prior on-duty approval before leave grant

---

### 5.3 Payroll Processing Workflow

```
Maker: HR Manager (prepare salary month — structure + attendance + leaves)
    ↓ (auto-calculations: PF, ESIC, PT, TDS, LOP, loans)
Checker: Accountant (verify totals, deductions, bank account details)
    ↓
Approver: Principal (authorize disbursement)
    ↓ (if branch total > threshold)
Final Approver: Finance Controller / Trustee
    ↓ (approved)
Action: Accountant generates bank NEFT file; uploads to bank
    ↓
Distribution: Salary slips auto-emailed to staff
    ↓
Audit: Full payroll register locked; revision = fresh cycle with reason
```

**Critical control:** Maker ≠ Checker ≠ Approver (strict separation of duties)  
**Revision:** Post-approval revision only with Principal + Finance Controller approval; creates audit trail  
**TDS/Form 16:** Accountant can generate; Principal approves issuance

---

### 5.4 Mark Correction Workflow (Post-Lock)

```
Initiator: Subject Teacher (request with reason: calculation error, wrongly keyed, re-evaluation result)
    ↓
Reviewer: HoD (verify original paper, check justification)
    ↓
Approver: Exam Coordinator (unlock specific student's marks for that subject)
    ↓
Principal: Final approval for any post-published corrections
    ↓ (approved)
Action: Teacher edits within unlock window (24-hour window auto-expires)
    ↓
Re-lock: Exam Coordinator re-locks; report card regenerated
    ↓
Audit: Old value, new value, reason, all approvers, timestamps — immutable log
    ↓
Parent Notification: If result changed
```

**Re-evaluation by parent:** Parent request → Class Teacher logs → Exam Coordinator reviews → Teacher re-checks → correction workflow if needed

---

### 5.5 Certificate Issuance (TC / Migration)

```
Initiator: Class Teacher (TC request after parent application)
    ↓
Check: Accountant (fee dues clearance — mandatory before TC)
    ↓ (if dues pending)
Block: TC blocked; parent notified of pending amount
    ↓ (if clear)
Check: Librarian (library dues clearance)
    ↓
Approver: Principal (sign-off; final TC register entry)
    ↓
Issue: System generates TC with serial number, school seal, digital signature
    ↓
Delivery: Print + Digital copy to parent app
    ↓
Audit: TC register entry (immutable); public verification QR generated
```

**No-dues certificate:** Automated check across Fees, Library, Inventory (if any item issued to student)

---

### 5.6 Expense Approval Workflow

```
Initiator: Any staff (requester submits voucher + bill upload)
    ↓
Reviewer: HoD / Department Head (if dept expense)
    ↓
Checker: Accountant (budget check, GST input credit, vendor verification)
    ↓
Approver: Principal (up to ₹25,000 per voucher)
    ↓ (if > ₹25,000 or capital expenditure)
Final Approver: Finance Controller / Trustee
    ↓
Action: Accountant processes payment; updates expense ledger
    ↓
Audit: Voucher number, amount, category, approvers, payment mode, bill reference
```

**Petty cash:** Accountant can approve up to ₹5,000 without workflow  
**Recurring expenses (salaries, utilities):** Auto-approved after initial setup; exceptions need workflow

---

### 5.7 Inventory Request Workflow

```
Initiator: Any staff / HoD (submit indent — item, quantity, purpose)
    ↓
Store Manager: Verify stock availability
    ↓ (if available)
Issue: Store Manager issues against indent; updates stock
    ↓ (if not available — purchase needed)
Store Manager: Raises PO with vendor quotations
    ↓
Accountant: Budget verification
    ↓
Approver: Principal (up to ₹10,000)
    ↓ (if > ₹10,000)
Finance Controller / Trustee: Final approval
    ↓
Action: Store Manager receives stock; updates inventory; notifies requester
    ↓
Audit: Indent → PO → GRN chain; asset register updated for capital items
```

---

### 5.8 Student Transfer (Branch to Branch)

```
Initiator: Parent (request at branch) → Class Teacher logs
    ↓
Source Branch: Accountant (dues clearance), Librarian (library clearance)
    ↓
Source Principal: Approve departure; generates transfer summary
    ↓
Group Admin / Trustee: Notified of inter-branch transfer
    ↓
Destination Branch Admin: Receives student record
    ↓
Destination Admission Officer: Allocates class, division, transport, hostel (if needed)
    ↓
Destination Principal: Confirms admission
    ↓
System: Student record transferred; source branch gets read-only history; destination gets active record
    ↓
Audit: Transfer log with dates, branches, approvers, fees settled
```

---

### 5.9 Admission Workflow (New Student)

```
Stage 1 — Enquiry: Receptionist / Online Form → Counsellor auto-assigned
    ↓ (follow-up cycle — 5 touchpoints)
Stage 2 — School Visit: Counsellor logs visit; schedules entrance test
    ↓
Stage 3 — Entrance Test / Interview: Exam Coordinator schedules; result logged
    ↓
Stage 4 — Form Submission: Admission Officer verifies documents
    ↓ (RTE track)
RTE Officer: Verifies income certificate, caste docs; adds to RTE register
    ↓ (General track)
Admission Head: Reviews merit list; confirms seat allocation
    ↓
Stage 5 — Fee Payment: Accountant / Online; generates admission fee receipt
    ↓
Stage 6 — Admission Confirmation: Enquiry converts to Student record (no re-typing)
    ↓
Principal: Notified; record active
    ↓
Audit: Enquiry ID → Student GR number trail; source attribution for marketing
```

---

## Section 6 — Security & Audit Controls

### 6.1 Critical Permissions (Require MFA Re-Authentication)

| Action | Module | Roles Allowed |
|--------|--------|---------------|
| Role assignment change | Role Management | Principal, Branch Admin, IT Admin |
| Payroll bank file download / release | Payroll | Accountant + Principal (dual sign-off) |
| Fee structure modification | Fees | Principal, Finance Controller |
| Fee waiver > 25% | Fees | Principal, Trustee |
| Bulk student PII export (Aadhaar, health) | Reports / Students | Compliance Officer, Principal only |
| Mark unlock post-publication | Examinations | Exam Coordinator + Principal |
| TC / Migration certificate issuance | Certificates | Principal only |
| Audit log access | Audit Logs | Compliance Officer, Principal, Branch Admin |
| Student record permanent delete | Students | Super Admin only (DPDP erasure request) |
| SaaS tenant provisioning / suspension | Settings | SaaS Super Admin |
| POSH report access | Discipline | ICC Members only (named individuals) |
| Aadhaar unmask | Students | Compliance Officer only (logged per view) |

---

### 6.2 Maker-Checker Processes

| Process | Maker | Checker | Notes |
|---------|-------|---------|-------|
| Payroll preparation | HR Manager | Accountant | Cannot be same person |
| Payroll release | Accountant | Principal | Bank file dual-auth |
| Fee waiver > threshold | Accountant (verify) | Principal / Trustee | Amount-based escalation |
| Expense payment > ₹25K | Accountant | Principal | Bill + approval mandatory |
| Inventory write-off | Store Manager | Principal | Physical verification cert |
| Student record merge (duplicate) | Branch Admin | Compliance Officer | Irreversible action |
| Mark correction | Teacher (edit) | HoD (verify) + Principal (approve) | Old values logged |
| Certificate issuance | Class Teacher (request) | Accountant (dues) + Principal (sign) | TC register permanent |

---

### 6.3 Audit Log Requirements

| Data Category | Fields Logged | Retention |
|---------------|---------------|-----------|
| Financial (fees, payroll, expenses) | User, role, action, amount, record ID, old value, new value, IP, timestamp | 7 years (GST/IT compliance) |
| Academic (marks, report cards) | User, role, subject, student ID, old marks, new marks, reason, approver chain | 3 years (board compliance) |
| Student PII access | User, role, field accessed (Aadhaar, health), IP, device | 3 years (DPDP) |
| Certificates (TC, Migration) | TC number, student, date, issuer, dues check result | Permanent |
| Role management changes | Admin user, target user, old role, new role, branch, timestamp | 7 years |
| Authentication | User ID, success/failure, IP, device, MFA status, timestamp | 1 year |
| Communication (bulk SMS/WhatsApp) | Sender, template, recipient group, message count, timestamp | 1 year (TRAI/DLT) |
| POSH reports | Anonymized ID, ICC members who accessed, actions taken | Permanent |

**Audit log rules:**
- Append-only — no edit, no delete by any user including Super Admin
- Separate tamper-evident storage from application database
- Export for auditors = Compliance Officer only, with full log of export itself

---

### 6.4 High-Risk Actions — Explicit Controls

| Action | Risk | Control |
|--------|------|---------|
| Bulk SMS to entire school | Accidental mass messaging | Requires Principal approval; preview before send; DLT template only |
| Student photo gallery public publish | Child safety / consent | Event Coordinator + Principal approval; consent flag per student |
| POSH anonymous report unmasking | Victim safety | ICC Chair only; cannot be delegated |
| Cross-branch student data view | Data segregation breach | Explicit cross-branch grant by Trustee; logged per access |
| Aadhaar display | DPDP compliance | Masked by default; unmask = Compliance Officer + re-auth + logged |
| Bulk data export > 500 records | Data leakage | Restricted to Principal/Compliance Officer; download link expires in 4 hours |
| Delete academic year / term | Data loss | Super Admin only; requires 2-person confirmation + 48h delay |
| Payroll bank file | Financial fraud | Dual-auth; file encrypted; recipient bank verified against HR records |

---

### 6.5 MFA Requirements

| Tier | Roles | MFA Type |
|------|-------|----------|
| Mandatory — always | SaaS Super Admin, Trustee, Finance Controller, Compliance Officer | TOTP (Google Authenticator / Authy) |
| Mandatory — school ops | Principal, Branch Admin, Accountant, HR Manager, IT Admin | TOTP or SMS OTP |
| Recommended | VP, HoD, Exam Coordinator, Admission Head, Store Manager | SMS OTP |
| OTP on sensitive action | Subject Teacher (mark unlock), Librarian (bulk export) | In-app OTP for specific action |
| Device-bound | Driver | App PIN + device fingerprint |
| Standard login | Receptionist, Class Teacher, Parent, Student | Password + optional SMS OTP |

---

### 6.6 Indian Compliance Controls

| Regulation | Control Required | Roles Responsible |
|------------|-----------------|-------------------|
| DPDP Act 2023 | Parent consent at admission; right to erasure workflow; data minimisation | Compliance Officer, IT Admin |
| Aadhaar (UIDAI rules) | Never store in plain text; masked display (XXXX-XXXX-1234); no third-party sharing | IT Admin, Compliance Officer |
| RTE Act | 25% quota tracking; fee exemption; state reporting | RTE Officer, Admission Head |
| POSH Act | ICC workflow; anonymous reporting option; 90-day resolution | Discipline Coordinator, Principal |
| GST | HSN/SAC codes on invoices; GSTR-1/3B; input credit | Accountant |
| TRAI / DLT | DLT-registered sender ID; template pre-approval; no promotional to DND | IT Admin, Accountant |
| UDISE+ | Annual demographic data; MoE submission | UDISE+ Operator, Compliance Officer |
| NCPCR | Child data special protection; no profiling without consent | Compliance Officer |

---

## Section 7 — Missing Roles (New Additions)

| Role | Why Needed (Spec Reference) | Owns Module(s) |
|------|-----------------------------|----------------|
| Group Academic Director | Spec implies cross-branch academic consistency (Section 32); not in Sec 3 role list | Academics, Examinations (cross-branch view) |
| Group Finance Controller | Multi-branch payroll and P&L (Sections 19, 32) needs dedicated finance authority | Payroll (release), Expenses, Fees (group) |
| Compliance Officer | DPDP, RTE, POSH, UDISE+ (Section 36) is a full-time function at scale | Audit Logs, Reports (compliance), Settings (privacy) |
| Branch Admin | Multi-branch ops delegation (Section 32) — Principal cannot manage all admin tasks | Settings, Role Management, Inventory, Events |
| Academic Supervisor | Lesson plan review and CCE coordination (Sections 7, 11) is operationally distinct from VP | Academics oversight, Homework review |
| Exam Coordinator | Exam scheduling, seating, mark lock (Section 11) is a dedicated function at large schools | Examinations (full ops) |
| Counsellor | Confidential sessions, POSH support (Sections 21, 22, 37) | Discipline (counsellor notes), Health |
| Discipline Coordinator | Behaviour incidents, anti-bullying, POSH ICC (Section 21) | Discipline |
| School Nurse / Health Officer | Annual check-ups, clinic log, vaccinations (Section 22) | Health |
| Store Manager | Inventory indent, asset register, vendors (Section 24) | Inventory |
| Event Coordinator | Annual Day, Sports Day, gallery (Section 23) | Events, Certificates (participation) |
| Reception Manager | Front-office supervision, OTP dispatch oversight (Section 26) | Visitor Management |
| IT Administrator | Role management, system config, integrations (Section 20) | Settings, Role Management |
| MDM Coordinator *(Govt/Aided)* | PM POSHAN, consumption register, state reports (Section 17) | Meal Planner, Reports (MDM) |
| RTE Officer *(Govt/Aided)* | 25% quota, fee exemption, state reporting (Sections 4, 10, 36) | Admissions (RTE), Fees (RTE) |
| UDISE+ Data Operator *(Govt/Aided)* | Annual MoE data submission (Section 36) | Reports (UDISE+), Students (demographic) |
| Lab Assistant | Lab equipment, safety, consumables (implied by Section 7 — Practical/Lab subjects) | Inventory (lab), Study Material (lab notes) |
| Mess Manager | Weekly menu, kitchen stock, nutritional info (Section 17) | Meal Planner, Inventory (kitchen) |

---

## Section 8 — UI Personalization

### Design Principles
- **Least-surprise navigation:** Each role lands on a dashboard that matches their primary daily task
- **Mobile-first for field roles:** Driver, Parent, Student get bottom-nav mobile apps (Section 31)
- **Multi-role UI:** Sidebar = union of granted menus; Dashboard = tabbed by role; "My Roles" switcher in profile
- **Language-first:** Default language = user's preference (Section 34); all menu labels and notifications in that language
- **Density by role:** Trustee = high-density KPI view; Student = simple card-based; Driver = single-action screen

---

### 8.1 Super Admin
- **Landing:** SaaS ops dashboard — tenant grid, revenue chart, uptime gauge
- **Nav:** Admin sidebar, no school content
- **UI density:** High (data tables)
- **Color accent:** Dark blue / enterprise

### 8.2 Trustee
- **Landing:** Group KPI tiles — total strength, fee collected, branch comparison bar chart, P&L snapshot
- **Nav:** Minimal sidebar — Reports, Approvals, Fees, Payroll
- **UI density:** Medium (executive summary)
- **Differentiator:** "Approvals" inbox prominently surfaced; read-heavy UI
- **Color accent:** Gold / prestige

### 8.3 Principal
- **Landing:** 8-widget ops dashboard — live attendance %, fee today, approvals queue, staff present, pending TCs, exam upcoming, long-absent alerts, recent notices
- **Nav:** Full sidebar; Settings and Role Management visible
- **UI density:** High
- **Differentiator:** Approval workflow inbox is primary CTA; everything accessible from single sidebar
- **Color accent:** School brand colors (white-label)

### 8.4 Vice Principal
- **Landing:** Academic ops — syllabus heatmap, substitution board, pending lesson plans, exam countdown
- **Nav:** Academic-heavy; Finance/HR hidden
- **UI density:** Medium-high
- **Differentiator:** Substitution board as a featured widget (daily operational need)

### 8.5 HoD
- **Landing:** Department scorecard — syllabus %, teacher performance, marks entry status, dept attendance
- **Nav:** Dept-scoped academics; other depts grayed out
- **UI density:** Medium
- **Differentiator:** Department filter pre-applied everywhere; cross-dept data not visible

### 8.6 Class Teacher
- **Landing:** "My Class" — attendance widget (quick mark), parent message inbox, homework tracker, defaulter highlight
- **Nav:** Slim sidebar — My Class, Communication, Homework, Certificates, Tasks
- **UI density:** Low-medium (task-focused)
- **Differentiator:** One-tap attendance marking on landing; parent chat prominently surfaced

### 8.7 Subject Teacher
- **Landing:** "My Day" — today's periods, pending homework reviews, marks entry status, syllabus %
- **Nav:** Academics + Homework + Study Material + Exams (own subjects only)
- **UI density:** Low-medium
- **Differentiator:** Timetable-driven UI — today's schedule is the entry point

### 8.8 Admission Officer / Head
- **Landing:** Enquiry Kanban pipeline — New → Contacted → Visit → Form → Admitted
- **Nav:** Admissions-focused; Students (post-admission) as secondary
- **UI density:** Medium (pipeline view)
- **Differentiator:** Conversion funnel prominently shown; follow-up due-today highlighted in red

### 8.9 Accountant
- **Landing:** Financial dashboard — fee collected (daily/monthly bar), defaulter count, payroll processing status, expense burn
- **Nav:** Finance-centric — Fees, Payroll, Expenses; academic modules hidden
- **UI density:** High (financial tables)
- **Differentiator:** Day book as default landing report; quick-receipt generation in FAB

### 8.10 HR Manager
- **Landing:** People dashboard — staff present %, leave requests pending, payroll month status, appraisal cycle
- **Nav:** HR + Payroll; student academic modules hidden
- **UI density:** Medium
- **Differentiator:** Leave approval queue as primary inbox

### 8.11 Librarian
- **Landing:** Library ops — today's issues/returns, overdue list, fine collected, low-stock alerts
- **Nav:** Library only
- **UI density:** Medium (catalogue-heavy)
- **Differentiator:** Barcode/QR scan integration on landing for fast issue/return

### 8.12 Transport Manager
- **Landing:** Live map — all buses on route, today's dispatch status, SOS alerts
- **Nav:** Transport module + Communication; financial modules hidden
- **UI density:** Medium (map-first)
- **Differentiator:** Real-time GPS map is the primary view; document expiry alerts in sidebar badge

### 8.13 Hostel Warden
- **Landing:** Hostel ops — boarders present/absent tonight, leave approvals pending, mess today
- **Nav:** Hostel + Meal Planner + Visitor (hostel) + Communication
- **UI density:** Medium
- **Differentiator:** Roll call (attendance) is primary morning/night action

### 8.14 Receptionist
- **Landing:** "Front Desk" — active visitors inside, gate passes issued today, phone log
- **Nav:** Visitor Management only + Enquiry create
- **UI density:** Low (action-oriented)
- **Differentiator:** Fast visitor entry form; OTP dispatch button prominent

### 8.15 Driver
- **Mobile App — Single-purpose:**
  - Full screen: Route map + Start Route button
  - Boarding scan screen (RFID/QR)
  - SOS big red button (always accessible)
  - Fuel log entry
- **Nav:** Bottom tabs — Route, Boarding, SOS, Log
- **UI density:** Minimal (driving-safe large buttons)
- **Language:** Auto-set to driver's regional language (Hindi/Gujarati/Tamil etc.)

### 8.16 Parent
- **Mobile App Landing:** "Today" card — child's attendance status (green/red), today's homework list, fee due badge, latest notice
- **Nav:** Bottom tabs — Today, Fees, Chat, Bus, More
- **Multi-child:** Child switcher at top (photo bubbles)
- **UI density:** Low (parent-friendly, non-technical)
- **Language:** Parent's chosen regional language
- **Differentiator:** Attendance status visible within seconds of opening app; fee payment in 2 taps

### 8.17 Student
- **Mobile App Landing:** Today's timetable + homework due
- **Nav:** Bottom tabs — Home, Study, Tests, Results, Library
- **UI density:** Low (student-friendly, gamified where appropriate)
- **Differentiator:** Exam countdown timer; leaderboard (if enabled by school); achievement badges

### 8.18 Alumni
- **Web / Mobile Landing:** Alumni directory + upcoming events + mentorship matching
- **Nav:** Directory, Events, Donate, My Profile, Mentorship
- **UI density:** Low
- **Differentiator:** Class/batch-based directory filter; news feed of school achievements

---

## Appendix A — Dual-Track Role Map (Private vs Govt/Aided)

| Private School Track | Govt / Aided School Additional Roles |
|---------------------|--------------------------------------|
| Admission Officer | + RTE Officer |
| Accountant | (Fee exemption tracking) |
| Hostel Warden | (MDM Coordinator for residential MDM) |
| Receptionist | + MDM Coordinator (if day school with MDM) |
| Reports | + UDISE+ Data Operator |
| Compliance Officer | + POSH ICC Member designation |

---

## Appendix B — Permission Escalation Thresholds (Configurable per Tenant)

| Action | Level 1 (Principal) | Level 2 (Finance Controller) | Level 3 (Trustee) |
|--------|---------------------|------------------------------|-------------------|
| Fee waiver | Up to 20% | 21–40% | Above 40% |
| Single expense voucher | Up to ₹25,000 | ₹25,001–₹1,00,000 | Above ₹1,00,000 |
| Inventory purchase order | Up to ₹10,000 | ₹10,001–₹50,000 | Above ₹50,000 |
| Payroll revision | Any revision needs | Additional sign-off if > ₹5,000 total change | Structural changes |
| Staff salary increment | Up to 10% | 11–20% | Above 20% |

*All thresholds are defaults; each tenant can reconfigure via Settings → Approval Thresholds.*

---

## Appendix C — Scope Attribute Quick Reference

| Role | Branch Scope | Data Scope | Student Scope |
|------|-------------|------------|---------------|
| SaaS Super Admin | all_branches (all tenants) | group (system) | none |
| Trustee | all_branches | group | all |
| Finance Controller | all_branches | group (financial) | none |
| Academic Director | all_branches | school (academic) | all |
| Compliance Officer | all_branches | school (compliance) | all |
| Principal | own_branch | school | all |
| Vice Principal | own_branch | school | all |
| Branch Admin | own_branch | school | all |
| HoD | own_branch | department | assigned_students |
| Exam Coordinator | own_branch | school | all |
| Class Teacher | own_branch | division | assigned_students |
| Subject Teacher | own_branch | own | assigned_students |
| Accountant | own_branch | school (financial) | all (fee data) |
| HR Manager | own_branch | school (staff) | none |
| Librarian | own_branch | school (library) | all (borrowing) |
| Transport Manager | own_branch | school (transport) | all |
| Hostel Warden | own_branch | school (hostel) | assigned_students |
| Parent | own_branch (child's) | — | own_children |
| Student | own_branch | — | own |
| Alumni | own_branch (historical) | — | own |

---

*Document generated from: Enterprise School ERP Indian Specification v2.0 | Architecture by RBAC Design Session — June 2026*
*Framework: RBAC + Scope Attributes | Compliance: DPDP 2023, RTE, POSH, GST, TRAI/DLT, UDISE+*
