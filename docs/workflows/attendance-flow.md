# Attendance Workflow

## Flow Diagram

```mermaid
flowchart TD
  A[Teacher opens Attendance page] --> B[Select Division + Date]
  B --> C[Load student list from enrollment]
  C --> D{Period-wise?}
  D -->|Yes| E[Select Period]
  D -->|No| F[Daily attendance]
  E --> G[Mark each student: Present/Absent/Late/Leave]
  F --> G
  G --> H[POST /attendance/students/bulk upsert]
  H --> I[Save StudentAttendance document]
  I --> J[Fire attendance.marked event]
  J --> K{Any Absent?}
  K -->|Yes| L[Queue SMS to parents within 30 min]
  K -->|No| M[Done]
  L --> M
  I --> N{Absent streak >= 3 days?}
  N -->|Yes| O[Fire attendance.long_absence event]
  O --> P[Alert class teacher + principal]
```

## Event Consumers

| Event | Consumer | Action |
|-------|----------|--------|
| `attendance.student.absent` | Communication | SMS to parent |
| `attendance.long_absence` | Communication | Alert teacher + principal |
| `leave.approved` | Timetable | Schedule substitution if staff |
