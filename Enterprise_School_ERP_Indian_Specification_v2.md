# Enterprise School ERP — Indian Edition
**Functional Specification • Multi-Tenant SaaS for Indian Schools**
*Designed for CBSE, ICSE, IB & State Boards (GSEB, Maharashtra, Tamil Nadu, etc.)*
Functional Documentation • Version 2.0 • June 2026

---

## Table of Contents
1. Introduction
2. Indian School System & Cultural Context
3. User Roles
4. Admission & Enquiry Management
5. Student Information Management
6. Academic Structure
7. Subject Master
8. Timetable & Scheduling
9. Attendance Management
10. Fee Management
11. Examination & Assessment
12. Classwork, Homework & Assignments
13. Learning Management (Study Material)
14. Communication (SMS / WhatsApp / Email / Notices)
15. Transport Management
16. Hostel Management
17. Meal Planner / Mess / Mid-Day Meal
18. Library Management
19. HR & Payroll
20. Staff Role & Access Management
21. Discipline & Behaviour
22. Health & Wellness
23. Events, Calendar & Photo Gallery
24. Inventory / Stock Management
25. Expense Management
26. Visitor & Front Office
27. Task Management
28. Certificate Generation
29. Alumni Management
30. Reports & Dashboards
31. Mobile App
32. Multi-Branch / Multi-Tenant
33. Website Builder
34. Multi-Language Support
35. SaaS Operations
36. Compliance & Data Protection
37. Sample Personas (Indian Context)
38. Glossary

---

## 1. Introduction

### 1.1 Purpose
This document describes the full set of features for a cloud-based School Management System (ERP) built for Indian schools. It is written as a functional specification — what the product does, how each module works for the user, and what business rules apply. It does **not** cover databases, APIs, code, or technical implementation.

### 1.2 Audience
- School owners, trustees, and management committees.
- Principals, vice-principals, academic coordinators.
- Administrative staff (admissions, accounts, transport, hostel, library).
- Teachers, class teachers, and HoDs.
- Parents and students using the mobile and web app.
- Product, design, and content teams.

### 1.3 Product Vision
A single, easy-to-use SaaS platform that runs the entire operations of an Indian school — from the first admission enquiry to the final transfer certificate. It serves CBSE, ICSE, IB, and all State Boards, supports multiple branches, works in English and regional languages, and is accessible on web and mobile.

### 1.4 Scope
- **Academics** — standards, divisions, subjects, syllabus, lesson plans, classwork, homework, assignments, exams, report cards.
- **Operations** — admissions, attendance, fees, transport, hostel, library, inventory, expenses, HR & payroll.
- **Communication** — SMS, WhatsApp, push, email, notices, parent-teacher chat.
- **Compliance** — DPDP Act 2023, RTE 25%, UDISE+, board reporting, GST.
- **SaaS** — multi-tenant, multi-branch, multi-language, role-based access, white-label, website builder.

---

## 2. Indian School System & Cultural Context

### 2.1 Academic Calendar
The Indian academic year typically runs **April → March**. Some State Boards begin in June. Each year is split into Terms / Semesters / Trimesters as per the school's choice.

### 2.2 Standards & Divisions

| Stage | Standards | Typical Age |
|---|---|---|
| Pre-Primary | Nursery, LKG, UKG | 3–5 |
| Primary | 1st – 5th | 6–10 |
| Middle / Upper Primary | 6th – 8th | 11–13 |
| Secondary | 9th – 10th | 14–15 |
| Senior Secondary | 11th – 12th (Sci / Com / Arts) | 16–17 |

Each Standard is divided into **Divisions** (A, B, C…) — also called Sections. The platform uses "Division" but schools can rename it.

### 2.3 Streams (Class 11 & 12)
- **Science** — PCM, PCB, PCMB combinations.
- **Commerce** — with or without Mathematics.
- **Arts / Humanities** — History, Political Science, Psychology, etc.
- **Vocational** — as per CBSE / State Board offerings.

### 2.4 Boards Supported
- CBSE
- ICSE / ISC
- IB (PYP, MYP, DP)
- Cambridge (IGCSE, A-Levels)
- State Boards — GSEB, Maharashtra, Tamil Nadu, Karnataka, UP, West Bengal, and others.

### 2.5 Indian Cultural Touchpoints
- Festivals built into the academic calendar — Diwali, Holi, Raksha Bandhan, Janmashtami, Ganesh Chaturthi, Navratri, Eid, Christmas, Pongal, Onam, Bihu, Gurpurab.
- **Morning Assembly** module — thought of the day, news, birthdays, achievements, national anthem.
- National Days — Republic Day, Independence Day, Gandhi Jayanti, Teacher's Day (5 Sep), Children's Day (14 Nov).
- Indian names, addresses (with PIN code), and language scripts (Devanagari, Gujarati, Tamil, Telugu, Kannada, Bengali, Marathi, Punjabi).
- Currency in Indian Rupees (₹) with lakhs / crores formatting.
- UPI payments (Razorpay / PhonePe / Paytm / Google Pay) as the default fee collection method.

---

## 3. User Roles

A single user can hold more than one role (e.g. a Teacher who is also a Class Teacher and Exam Coordinator).

| Role | Primary Use |
|---|---|
| Super Admin (SaaS Owner) | Manages all schools (tenants), plans, system updates. |
| School Owner / Trustee | Top-level view of branches; financial & academic dashboards. |
| Principal | Full access to academics, staff, students, finance for the school/branch. |
| Vice-Principal / Academic Coordinator | Timetable, syllabus, exams, teacher monitoring. |
| HoD | Manages subjects, faculty, results of their department. |
| Class Teacher | Owns one Standard-Division: attendance, discipline, parents, report cards. |
| Subject Teacher / Faculty | Lesson plan, classwork, homework, marks entry. |
| Admission Officer | Enquiries, admission forms, documents, fee quotation. |
| Accountant / Cashier | Fee collection, expense entry, payroll, GST, day book. |
| Librarian | Books, issue/return, fines, reading register. |
| Transport In-charge | Routes, vehicles, drivers, GPS, student allocation. |
| Hostel Warden | Rooms, allocation, attendance, leave, meal planning. |
| HR Manager | Staff records, leaves, payroll, appraisals. |
| Receptionist / Front Office | Visitors, enquiries, gate pass, calls. |
| Driver | Route start/stop, student boarding, SOS. |
| Parent / Guardian | Child's attendance, marks, homework, fees, notices, leave. |
| Student | Timetable, homework, study material, results, library, MCQ. |
| Alumni | Directory, events, donations. |

---

## 4. Admission & Enquiry Management

### 4.1 Enquiry Management
Captures every prospective parent / student interaction — walk-in, phone call, website form, WhatsApp, education fair — and converts it into an admission.
- **Source tracking** — Walk-in, Reference, Newspaper, Website, Hoarding, Justdial, Facebook, Instagram, Google Ad.
- Auto-assignment to a counsellor with follow-up reminders.
- **Status pipeline** — New → Contacted → School Visit → Form Issued → Form Submitted → Admitted / Lost.
- Bulk SMS / WhatsApp follow-up with prospectus.
- Counsellor performance reports — enquiries handled, conversion %, response time.

### 4.2 Online Admission Form
- Public-facing portal branded with school's logo and colours.
- Step-by-step — Student / Parent / Previous school / Documents / Photo.
- Aadhaar capture (optional, masked), DOB proof, caste certificate (for reservations / RTE).
- Sibling discount auto-detection.
- Online admission fee payment via UPI / Card / Net Banking.

### 4.3 Admission Process
- Document checklist — Birth certificate, Aadhaar, previous TC, mark sheet, address proof, caste, medical.
- Entrance test / interview scheduling with auto-allocated slots.
- Merit list generation.
- **RTE 25% quota** tracking with separate workflow.
- One-click admission letter generation.
- On confirmation, enquiry converts to a Student record automatically — no re-typing.

### 4.4 Re-admission & Promotion
- End-of-year bulk promotion to next Standard.
- Detention / retention handling.
- Bulk re-admission fee generation.

---

## 5. Student Information Management

### 5.1 Student 360° Profile
One-click view — academic, attendance, fees, behaviour, health, library, transport, hostel — on a single screen.
- **Personal** — Name, photo, DOB, gender, blood group, religion, caste, category (Gen/OBC/SC/ST), mother tongue.
- **Identification** — Admission no., Roll no., GR no., UDISE Pen no., Aadhaar (masked), APAAR ID.
- **Family** — Father, Mother, Guardian with occupation, qualification, income, contact, photo.
- **Address** — Current and permanent (PIN code, state, district, taluka, village).
- **Academic** — Current Standard, Division, Stream, Subjects, House, Class Teacher.
- **Documents** — Birth certificate, previous TC, caste/income certificate, medical.
- **Health** — Allergies, chronic conditions, medication, vaccinations, height/weight history.
- **Discipline / Remarks** — Incidents, awards, suspensions.

### 5.2 Student ID Card
- Auto-generated with photo, QR code, school logo, address, blood group, parent contact.
- Customisable templates per branch.
- Bulk printing for a Standard / Division.

### 5.3 Bulk Import / Export
- Excel import with validation.
- Export to Excel / PDF for board submissions.

### 5.4 Transfer Certificate (TC) & Bonafide
- One-click TC, Bonafide, Character, Conduct certificates with school seal.
- TC register maintained automatically with serial number.

---

## 6. Academic Structure

### 6.1 Hierarchy
**Academic Year → Standard → Division → Subjects → Chapters → Topics → Lessons / Periods.**

### 6.2 Academic Year Setup
- Create new year (e.g. 2026–27) with start and end date.
- Define Terms / Semesters / Trimesters — e.g. Term 1 (Apr–Sep), Term 2 (Oct–Mar).
- Holiday list — national, religious, regional, school-specific.
- Working days, working Saturdays (1st, 3rd off pattern), half-days.

### 6.3 Houses
- Traditional 4-house system — Red, Blue, Green, Yellow (or themed — Tagore, Gandhi, Bose, Nehru).
- House points for academics, sports, discipline, cultural events.
- House-wise leaderboards and annual house trophy.

---

## 7. Subject Master

### 7.1 Subject Types
- **Core** — Mathematics, Science, Social Science, English.
- **Language** — First / Second / Third Language (Hindi, Sanskrit, Gujarati, Marathi, Tamil, French, German).
- **Elective** — Computer Science, Physical Education, Art, Music.
- **Co-scholastic** — Work Education, Health & Wellness, GK, Value Education, Moral Science.
- **Practical / Lab** — Physics, Chemistry, Biology, Computer Lab.

### 7.2 Board-wise Subject Codes (Reference)

| Subject | CBSE Code | ICSE Code |
|---|---|---|
| Hindi | 002 / 085 | — |
| English | 184 / 301 | EN01 |
| Mathematics | 041 / 241 | MA01 |
| Science | 086 | SC01 |
| Social Science | 087 | — |
| Sanskrit | 122 | SK01 |
| Computer Science | 083 | CS01 |
| Physics | 042 | PH01 |
| Chemistry | 043 | CH01 |
| Biology | 044 | BI01 |

### 7.3 Syllabus Management
- Define Chapters and Topics under each Subject per Standard.
- Map syllabus to Term 1 / Term 2 / Quarterly / Half-yearly / Final.
- Reference textbook (NCERT / board-prescribed / school-prescribed) and chapter weightage.
- **Syllabus completion tracking** — teacher updates % completed per chapter.
- Parent view — what is being taught this week, what is upcoming.

---

## 8. Timetable & Scheduling

### 8.1 Period Configuration
- Daily periods (Period 1, 2, 3 …) with start / end times.
- Recess, Lunch, Short Break, Assembly, Zero Period.
- Different schedules for half-days, Saturdays, exam days.

### 8.2 Weekly Timetable
- Visual drag-and-drop grid (Standard-Division × Day × Period).
- Assigns Subject, Teacher, Room/Lab per slot.
- Colour-coded by subject / department.

### 8.3 Auto-Generation
Conflict-free timetable generated automatically using rules:
- Teacher's max periods per day and per week.
- Subject's required periods per week (Maths 6, English 5, PT 2).
- Same subject not back-to-back unless a double period (Lab).
- Heavy subjects (Maths, Science) before recess; activity subjects after.
- Lab availability — only one Division can use Physics Lab at a time.
- Teacher off-day preference (Saturday off for visiting faculty).

### 8.4 Substitution / Proxy
- When a teacher is on leave, system suggests free teachers for the day.
- One-click substitution; SMS / WhatsApp / push to the substitute.
- Daily substitution register for academic office.

### 8.5 Exam Timetable
- Date sheet for each exam (Unit Test, Half-Yearly, Annual, Pre-Board, Practical).
- No two papers for the same student on the same day (auto-check).
- Room, invigilator, seating arrangement.
- Publish to students / parents via app, SMS, notice board.

### 8.6 Faculty Diary / Daily Plan
- Each teacher's daily plan — what to teach in each period, learning outcome, activity, homework.
- Mark each period Taught / Pending / Postponed with notes.
- HoD / Principal can review and comment.

---

## 9. Attendance Management

### 9.1 Student Attendance
- Daily attendance by Class Teacher — Present / Absent / Late / Leave.
- Period-wise for senior classes — captures subject-wise absenteeism.
- **Methods** — Manual on tablet, Biometric (fingerprint / face), RFID card, QR scan at gate.
- Auto SMS / WhatsApp to parent on absent — within 30 minutes of school start.
- Leave application by parent through app with reason and dates.
- Medical leave with certificate upload.
- Monthly attendance % for Annual Report Card.
- **Long-absence alert** — auto-flag if absent more than 3 / 7 / 15 days.

### 9.2 Staff Attendance
- Biometric / face / mobile geo-fenced check-in.
- Late mark rules with grace period.
- Half-day, on-duty, casual, sick, earned, maternity, paternity leave.
- Direct link to payroll for leave-without-pay.

---

## 10. Fee Management

### 10.1 Fee Structure
- Tuition, Admission, Caution deposit, Term, Annual.
- Component-wise — Tuition, Computer, Lab, Library, Sports, Activity, Smart Class, Magazine.
- Optional add-ons — Transport (per km / per route), Hostel (per room type), Mess, Uniform, Books.
- Different structures per Standard, Stream, Category (Gen / RTE), Branch.

### 10.2 Concessions & Scholarships
- Sibling discount (10% on 2nd child, 15% on 3rd).
- Staff ward discount.
- Merit, Sports, Need-based scholarships.
- RTE 25% — fully exempted, reimbursed by State Government.
- Approval workflow — requested by class teacher → approved by Principal / Trustee.

### 10.3 Fee Collection
- Cash, Cheque, DD, NEFT, RTGS, UPI, Card, Net Banking.
- Online via Razorpay / PhonePe / Paytm / Cashfree / PayU.
- Auto-receipt with school logo, GST (if applicable), in Rupees.
- Partial payment, installments, post-dated cheques.
- Late fee — daily / monthly slab based, with auto-waiver rules.
- Bounced cheque charges, gateway charges (absorbed or passed on).

### 10.4 Reminders
- Auto SMS + WhatsApp + Email + App notification — 7 days before due, on due date, weekly after.
- Defaulter list for front office and accountant.
- Block ID card / TC issuance for serious defaulters (configurable).

### 10.5 GST Handling
- Tuition fees exempt from GST.
- Transport, hostel, mess, uniform — GST applicable per slab.
- HSN / SAC code per fee component.
- GSTR-1 / GSTR-3B ready report for accountant / CA.

### 10.6 Reports
- Day book, Collection register, Defaulter list, Class-wise pending, Component-wise income.
- Bank reconciliation — match collected fees with bank credit.

---

## 11. Examination & Assessment

### 11.1 Exam Types
Unit Test (PT1, PT2, PT3) • Half-Yearly • Annual • Pre-Board • Practical • Project • Viva • MCQ / Online • Olympiad • Internal.

### 11.2 Grading Patterns
- **CBSE** — Marks + Grade (A1, A2, B1, B2, C1, C2, D, E) + Co-scholastic (A/B/C).
- **ICSE** — Marks-based with subject-wise minimum.
- **IB** — 1 to 7 scale.
- **State Boards** — as per board norms.
- **CCE** (Continuous & Comprehensive Evaluation) for Primary.

### 11.3 Marks Entry
- Teacher entry via app / web — locked after submission.
- Bulk Excel upload with validation (cannot exceed max marks).
- HoD / Principal verification and lock.
- Re-evaluation request workflow by parent.

### 11.4 Online MCQ Examination
- Create question bank — MCQ, True/False, Fill-in-the-blank, Short Answer.
- Auto-shuffle questions and options per student.
- Time-limited test with auto-submit.
- Auto-evaluation for objective, manual for subjective.
- Browser lockdown / camera proctoring for high-stakes tests.
- Student leaderboard, attempt history, weak-topic analysis.

### 11.5 Report Cards
- CBSE / ICSE / IB / custom templates with school logo, principal's signature, photo, attendance %, remarks.
- Co-scholastic grades — Work Education, Art, Health, Discipline.
- Rank / Position — class-wise, division-wise (optional, can be turned off).
- Personalised teacher remarks (or AI-suggested for teacher to review).
- Digital signature, email & app delivery, printable PDF.

### 11.6 Analytics
- Subject-wise performance, weak student identification, top performers.
- Compare a student across exams over years.
- Teacher performance — average marks across divisions.

---

## 12. Classwork, Homework & Assignments

### 12.1 Classwork
- Teacher posts today's classwork — topic taught, key points, board notes (photo).
- Linked to syllabus chapter and updates completion %.
- Visible to parents and absent students.

### 12.2 Homework
- Daily homework with subject, description, due date, attachments (PDF, photo, audio, video link).
- Parent sees today's homework consolidated across all subjects.
- Student / parent marks as Done; teacher reviews.
- Auto-reminder before due.

### 12.3 Assignments / Projects
- Long-form — research, model, science fair.
- Online submission (file / photo) or offline (mark received).
- Rubric-based grading.
- Plagiarism note for senior classes.

---

## 13. Learning Management (Study Material)

- Chapter-wise notes, PPT, PDF, audio, video uploaded by teacher.
- Curated content from NCERT, DIKSHA, school's own library.
- Recorded class videos for absent students / revision.
- Quiz / practice questions per chapter.
- Live classes via Zoom / Google Meet with attendance capture.
- Student progress per chapter — read / watched / attempted.

---

## 14. Communication

### 14.1 SMS
- DLT-registered sender ID and templates (TRAI compliant).
- Transactional — attendance, fees, exam, results, emergency.
- Bulk SMS to selected groups (a Standard, a Division, all parents, all staff).
- Multi-language SMS (Hindi, Gujarati, Tamil, Marathi via Unicode).
- Credit-based or unlimited plans.

### 14.2 WhatsApp Integration
- WhatsApp Business API integration.
- Approved message templates — fee reminder, attendance alert, homework, notice.
- Two-way chat — parent reply routed to class teacher / front office.
- Document and image sharing (report card, receipt, circular).

### 14.3 Email
- School-branded email — circulars, newsletters, report cards, receipts.
- Mailing list management, bounce handling, open / click tracking.

### 14.4 Push Notifications
- In-app push for time-sensitive alerts — assembly cancelled, early dispatch, exam reminder.

### 14.5 Notice Board / Circular
- School-wide, Standard-wide, Division-wide, staff-only notices.
- Rich text with images, attachments, acknowledgement tracking.
- Auto-translate to regional language.

### 14.6 Parent-Teacher Chat
- In-app private chat between parent and class / subject teacher.
- Office hours, auto-reply outside hours.
- All chat archived for the school.

---

## 15. Transport Management

- **Routes** — define stops, sequence, distance, pickup / drop time.
- **Vehicles** — bus / van — registration, insurance, PUC, fitness, road tax with expiry alerts.
- **Driver & conductor** — license, training, police verification.
- **Student allocation** — route, stop, seat number.
- **GPS tracking** — live bus location on parent app.
- **RFID / mobile-based boarding scan** — SMS to parent on board / alight.
- Estimated arrival at next stop.
- **Driver app** — start route, mark stop reached, SOS, fuel log.
- Transport fees auto-calculated by route / distance with GST.
- Maintenance log, fuel log, km log.

---

## 16. Hostel Management

- Hostel blocks (Boys / Girls), floors, rooms, bed type (single / double / triple / dorm).
- Room allocation with waiting list and preference (friend roommate).
- Hostel attendance — morning, night roll call.
- Day-scholar / boarder leave application with parent OTP approval.
- Visitor & gate pass register for hostellers.
- Mess / Meal planner with dietary restrictions (Jain, Vegan, Lactose-free, allergy).
- Hostel fees, mess fees, laundry, electricity (extra appliance).
- Warden duty roster, incident log.

---

## 17. Meal Planner / Mess / Mid-Day Meal

- Weekly / monthly menu — breakfast, lunch, snacks, dinner.
- Indian regional menu — North Indian, South Indian, Gujarati thali, Jain, Bengali.
- Special days — festival sweets (Diwali, Holi), birthday cake.
- Nutritional info — calories, protein, vegetable count.
- Parent app shows what their child is eating this week.
- **Mid-Day Meal scheme (PM POSHAN)** for Government / Aided schools — beneficiary count, consumption register, MDM reports.
- Vendor management, raw material inventory, kitchen stock.

---

## 18. Library Management

- Catalogue — Books, magazines, journals, e-books, audio-books.
- Classification — Dewey / school-defined (Fiction, Reference, Story, Textbook, Encyclopedia).
- Barcode / QR / RFID-based issue and return.
- Member types — Student, Teacher, Staff with different borrowing limits and durations.
- Fine for late return / damage / loss — auto-calculated.
- Reservation / Hold queue.
- Reading register — top readers, recommendation engine.
- Digital library — e-books, study material, NCERT downloads.

---

## 19. HR & Payroll

### 19.1 Staff Records
- Personal — Name, DOB, Aadhaar, PAN, Bank, UAN, ESIC, Address.
- Qualifications, certifications, experience (previous schools).
- Appointment letter, increment letters, role changes — complete history.
- Document store — degrees, ID proof, photo, police verification.

### 19.2 Leave Management
- CL, SL, EL, ML, PL, LOP, Comp-off, On-duty.
- Leave balance, accrual, carry-forward, encashment.
- Multi-level approval — Reporting Officer → HoD → Principal.

### 19.3 Payroll
- Salary structure — Basic, DA, HRA, TA, CCA, Special Allowance, Bonus, Incentive.
- Deductions — PF, ESIC, Professional Tax, TDS, LWP, Loan EMI.
- Auto Form 16 generation, TDS computation.
- Salary slip via email / app in PDF with school letterhead.
- Bank transfer file (NEFT / bank-specific) for one-click salary release.

### 19.4 Performance & Appraisal
- Annual cycle, KRA / KPI, self-review, manager review.
- Increment recommendation, training plan.

### 19.5 Recruitment
- Job posting on school website / careers page.
- Applicant tracking, interview scheduling, offer letter, onboarding checklist.

---

## 20. Staff Role & Access Management

- Predefined roles (Principal, Teacher, Accountant, Librarian, …).
- Custom roles with module-wise and action-wise (View / Add / Edit / Delete) permissions.
- Multi-role users.
- Branch-wise access for multi-branch schools.
- **Audit log** — every login, every sensitive action (fee modification, mark change) logged with timestamp.

---

## 21. Discipline & Behaviour

- Merits and demerits with point system.
- Incident log — bullying, fight, late, uniform violation, mobile phone, etc.
- Counsellor notes (private).
- Parent meeting log.
- Suspension / Detention workflow with letter.
- **Anti-Bullying & POSH** (Prevention of Sexual Harassment) reporting (anonymous option).

---

## 22. Health & Wellness

- Annual medical check-up — height, weight, BMI, vision, dental, BP.
- Vaccination record — Polio, MMR, Hepatitis, HPV, COVID booster.
- Allergies, chronic conditions, regular medication.
- School clinic visit log — symptom, treatment, sent home.
- Yoga / PT / sports performance tracking.
- Counsellor sessions (confidential).

---

## 23. Events, Calendar & Photo Gallery

### 23.1 Calendar
- Academic year calendar with holidays, exams, events, PTMs.
- Filter — School / Standard / Division / My events.
- iCal / Google Calendar sync.

### 23.2 Events
- Annual Day, Sports Day, Cultural Fest, Science Exhibition, Investiture, Founder's Day.
- Online registration, fee collection for paid events, e-ticket.
- Participation certificates, prize register.

### 23.3 Photo & Video Gallery
- Event photographs uploaded by school photographer / teacher.
- Tagged by event, Standard, Division, House.
- Parents can view, download, and order print (optional).
- Face-blur / consent control for child safety.

---

## 24. Inventory / Stock Management

- Categories — Stationery, Lab equipment, Sports goods, Uniforms, IT assets, Furniture.
- Stock-in (purchase) and stock-out (issued to staff / department) with indent and approval.
- Vendor master, GST invoices, purchase orders.
- Asset register — issue to teacher / lab with serial number.
- Re-order level alerts, expiry alerts (chemicals, lab consumables).

---

## 25. Expense Management

- Category-wise — Salary, Utilities, Maintenance, Stationery, Marketing, Events, Repairs, Travel.
- Voucher entry with bill upload, GST input credit.
- Multi-level approval — Requester → HoD → Accountant → Principal.
- Petty cash register.
- Monthly / annual expense reports, P&L view for trustees.

---

## 26. Visitor & Front Office

- Visitor entry — name, phone, purpose, to-meet, photo, ID proof.
- Auto-printed gate pass with QR code.
- Pre-approved visitor list for parents (mother, father, guardian, driver, grandparent).
- **OTP-based student dispatch** — if a different person comes to pick up, parent OTP is mandatory.
- Phone call log, courier register.
- Lost & Found register.

---

## 27. Task Management

- Assign tasks to staff with due date, priority, description, attachments.
- Recurring tasks — monthly stock check, weekly lab safety check.
- Task dashboard — Pending / In Progress / Completed / Overdue.
- Comments and progress updates inside each task.
- Principal / HoD view — workload per staff.

---

## 28. Certificate Generation

- Bonafide, Character, Conduct, Migration, TC, Study Certificate.
- Participation, Merit, Achievement, Sports, Cultural — for events and competitions.
- Custom template designer with school logo, watermark, signatures, QR for verification.
- Bulk certificate printing for an event.
- Digital certificate sent to parent app with download option.
- **Public verification page** — anyone with the QR / certificate number can verify authenticity.

---

## 29. Alumni Management

- Alumni directory by batch / year / Standard.
- Profile with current job, location, photo, achievements.
- Alumni events, reunion registration.
- Donation / contribution module.
- Mentorship — alumni guiding current senior students for career.

---

## 30. Reports & Dashboards

### 30.1 Role-based Dashboards
- **Trustee** — branch comparison, revenue, expense, profitability.
- **Principal** — attendance %, fee collection, exam results, staff attendance, pending tasks.
- **Class Teacher** — my class attendance, defaulters, homework completion, parent messages.
- **Subject Teacher** — pending mark entry, syllabus completion, weak students.
- **Parent** — child's today (attendance, homework, classwork, events, fees).
- **Student** — today's timetable, homework, exam countdown, marks, library.

### 30.2 Standard Reports
- Admission, Strength, Attendance, Fee Collection, Defaulter, Marks, Result Analysis, Transport, Hostel, Library, Inventory, Payroll, Expense.
- Exportable to Excel, PDF, CSV.
- Email / WhatsApp scheduled reports to management.

### 30.3 Board / Government Reports
- UDISE+ — annual government data submission.
- CBSE / ICSE — registration, list of candidates, exam fees.
- RTE — quota seat report to State.
- Mid-Day Meal beneficiary report.

---

## 31. Mobile App

### 31.1 Parent App
- Today screen — attendance, classwork, homework, fee status, notices.
- Multi-child support — parents with 2–3 children switch easily.
- Fee payment via UPI / Card with auto-receipt.
- Apply leave, request meeting with teacher.
- Live transport tracking.
- Photo gallery, calendar, events.
- Report card download.

### 31.2 Student App
- Timetable, today's homework, study material, MCQ tests.
- Marks and rank (if enabled).
- Library book status.
- Events and notices.

### 31.3 Teacher App
- Mark attendance in 30 seconds.
- Post classwork, homework with photo of board.
- Marks entry.
- Parent chat.
- Today's substitutions.

### 31.4 Driver App
- Route start / stop, student boarding scan, SOS, fuel entry.

### 31.5 Principal / Owner App
- Live attendance %, fee collected today, pending approvals, complaints, staff present.

---

## 32. Multi-Branch / Multi-Tenant

- Each school / branch is a separate tenant with its own data, logo, theme, domain.
- Group-level (Trust / Society) dashboard for owners running multiple branches.
- Common student database for transfers between branches.
- Branch-wise fee structure, holidays, staff, but shared masters (subjects, boards).
- Centralised purchasing and inventory transfer between branches.

---

## 33. Website Builder

- Pre-built school website templates (Modern, Classic, Minimal).
- Pages — Home, About, Academics, Admissions, Facilities, Gallery, Contact, News.
- Drag-and-drop editor — no coding required.
- Online admission form embedded directly.
- News / Blog / Achievements section auto-updated from the ERP.
- SEO friendly — meta title, description, sitemap, school structured data.
- Custom domain (www.yourschool.edu.in) with SSL.

---

## 34. Multi-Language Support

- Interface in English, Hindi, Gujarati, Marathi, Tamil, Telugu, Kannada, Bengali, Punjabi, Malayalam, Urdu.
- Each user picks their preferred language.
- Communication (SMS, WhatsApp, Email) in parent's chosen language.
- Report cards and certificates printable in bilingual format (English + Regional).

---

## 35. SaaS Operations

### 35.1 Subscription Plans
- **Starter** — up to 250 students.
- **Growth** — up to 1,000 students.
- **Enterprise** — unlimited students, multi-branch, white-label.
- Pricing per student per year, billed annually with GST invoice.
- Add-on modules — SMS credits, WhatsApp, GPS, online MCQ, website builder.

### 35.2 Onboarding
- Free demo, trial, training (online + on-site).
- Data migration from existing system — Tally, Excel, legacy ERP.
- Customisation of report card, ID card, certificate templates.

### 35.3 Support
- Phone, WhatsApp, email, in-app chat — in English and regional languages.
- Dedicated account manager for Enterprise.
- Knowledge base, video tutorials, monthly product webinars.

### 35.4 Updates
- Continuous updates — no downtime, no installation needed.
- Release notes shared monthly.

---

## 36. Compliance & Data Protection

- **DPDP Act 2023** — parent consent, data minimisation, right to access / erase.
- Children's data — special protection, parent / guardian consent for processing.
- Aadhaar — never stored in plain form; masked display (XXXX-XXXX-1234).
- **RTE Act** — 25% quota tracking, fee exemption, State reporting.
- **POSH Act** — Internal Complaints Committee workflow, anonymous reporting.
- **UDISE+** — annual school statistics for MoE.
- CBSE / ICSE board affiliation requirements.
- **GST** — invoicing for taxable services.
- **TRAI / DLT** — SMS template registration.
- Data hosted in India.
- Daily backups, disaster recovery, 99.9% uptime SLA for Enterprise.

---

## 37. Sample Personas (Indian Context)

| Persona | Profile |
|---|---|
| Aarav Sharma | Class 8-B, Sunrise Public School, Delhi. House: Red. Father Rajesh (Engineer), Mother Priya (Doctor). |
| Diya Patel | Class 11 Science (PCM), Sardar Patel Vidyalaya, Ahmedabad. Hostel: Sarojini Block, Room 204. |
| Mrs. Sunita Iyer | Mathematics Teacher, Class Teacher 7-A. Loves spreadsheets and chai. |
| Mr. Vikram Reddy | Principal, Greenfield International, Hyderabad. Focused on board results and parent satisfaction. |
| Mr. Rakesh Singh | Bus driver, Route 12. Picks up 38 children from Sector 21. |
| Mrs. Kavita Nair | Parent of Aanya (Class 4) and Aryan (Class 9). Wants one app for both children. |

---

## 38. Glossary

| Term | Meaning |
|---|---|
| Standard | Class / Grade (1st to 12th). |
| Division | Section within a Standard (A, B, C…). |
| Stream | Subject group in Class 11–12 (Sci / Com / Arts). |
| House | Inter-student competition group (Red, Blue, Green, Yellow). |
| TC | Transfer Certificate. |
| UDISE+ | Unified District Information System for Education Plus — MoE database. |
| APAAR | Automated Permanent Academic Account Registry — student lifelong ID. |
| RTE | Right to Education Act — 25% quota for EWS. |
| DPDP | Digital Personal Data Protection Act, 2023. |
| DLT | Distributed Ledger Technology — TRAI SMS template registration. |
| NCERT | National Council of Educational Research and Training. |
| DIKSHA | Government of India digital learning platform. |
| POSH | Prevention of Sexual Harassment Act. |
| MDM / PM POSHAN | Mid-Day Meal / Government school nutrition scheme. |
| GR Number | General Register number — admission serial. |
| Pen Number | Permanent Education Number — UDISE student ID. |

---

*End of document.*
