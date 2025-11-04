# Digital Twin Enterprise System - Current Architecture Analysis

## Executive Summary
This document analyzes the existing NestJS monolithic backend for the Digital Twin Large-Scale Organization system, identifying domain boundaries, interdependencies, and current architectural patterns.

---

## 1. Current System Overview

### Technology Stack
- **Framework**: NestJS 11.x
- **ORM**: Prisma 6.15.0
- **Database**: MySQL
- **Authentication**: JWT with Passport
- **Validation**: class-validator, class-transformer
- **File Processing**: XLSX for import/export

### Application Purpose
The system provides a digital representation of large-scale organizations, modeling:
- Organizational hierarchy and structure
- Physical infrastructure (buildings, floors, rooms, tables)
- Workforce and job assignments
- Business processes and workflows
- Skills and task management

---

## 2. Domain Models Analysis

### Core Database Models (23 tables total)

#### **Authentication & Authorization Domain**
- `user` - System users with role-based access
- `role` - User roles (SUPER_ADMIN, etc.)

#### **Organization Domain**
- `company` - Root organizational entity
- `OrganizationType` - Company classification (Functional, Divisional, etc.)

#### **Workforce Domain**
- `people` - Employees/workforce members
- `job` - Job positions and roles
- `job_level` - Hierarchical job levels (NOVICE to EXPERT)
- `Function` - Organizational functions/departments (hierarchical)

#### **Physical Infrastructure Domain**
- `building` - Physical buildings
- `building_cell` - Building grid layout
- `floor` - Building floors
- `room` - Floor rooms with grid positioning
- `table` - Workstations/desks with capacity

#### **Process & Task Domain**
- `process` - Business processes (hierarchical)
- `task` - Individual work tasks
- `process_task` - Process-to-task workflow mapping

#### **Skills Domain**
- `skill` - Skills catalog
- `skill_level` - Skill proficiency levels
- `job_skill` - Job required skills
- `task_skill` - Task required skills

#### **Association Tables**
- `job_task` - Many-to-many: Job assignments to tasks
- `table_job` - Many-to-many: Workspace assignments

---

## 3. Current Module Structure

### NestJS Modules (16 modules)
```
src/
├── app.module.ts (Root module)
├── auth/ (Authentication & Authorization)
├── user/ (User management)
├── role/ (Role management)
├── company/ (Company operations)
├── organization-type/ (Org type catalog)
├── people/ (Employee management)
├── job/ (Job position management)
├── function/ (Organizational function/dept)
├── process/ (Business process management)
├── task/ (Task management)
├── skill/ (Skills catalog)
├── building/ (Building management)
├── floor/ (Floor management)
├── room/ (Room management)
├── table/ (Table/workstation management)
├── import & export/ (Data import/export utilities)
└── prisma/ (Database service layer)
```

---

## 4. Current Interdependencies

### Dependency Graph

#### **Company** (Root Entity)
- **Depends on**: OrganizationType, User (creator)
- **Depended by**: People, Job, Function, Process, Task, Building

#### **People** (Workforce)
- **Depends on**: Company, Job
- **Depended by**: None (leaf entity)

#### **Job**
- **Depends on**: Company, Function, job_level
- **Related to**: Task (via job_task), Skill (via job_skill), Table (via table_job)
- **Depended by**: People

#### **Function** (Department)
- **Depends on**: Company, parent Function (self-referencing hierarchy)
- **Depended by**: Job

#### **Process**
- **Depends on**: Company, parent Process (hierarchical), parent Task
- **Related to**: Task (via process_task)
- **Depended by**: Process (children), Task

#### **Task**
- **Depends on**: Company, Process (optional)
- **Related to**: Job (via job_task), Skill (via task_skill), Process (via process_task)

#### **Building Infrastructure Chain**
- Building → Company
- Floor → Building
- Room → Floor
- Table → Room
- Table → Job (via table_job)

---

## 5. Current Communication Patterns

### Monolithic Direct Imports
All services use **direct service imports** via NestJS dependency injection:

```typescript
// Example: PeopleService depends directly on Prisma
@Injectable()
export class PeopleService {
  constructor(private readonly prisma: PrismaService) {}
  
  async create(dto: CreatePeopleDto) {
    // Direct database access
    const job = await this.prisma.job.findUnique({...});
    // Validates job.company_id === dto.company_id
    return this.prisma.people.create({...});
  }
}
```

### Current Access Pattern
- **Single Shared Database**: All modules access the same MySQL database via Prisma
- **Synchronous Calls**: All operations are synchronous, in-process method calls
- **Transactional Consistency**: Enforced via Prisma transactions
- **No Service Boundaries**: Modules can query any table directly

### Data Validation Approach
Services validate cross-entity relationships inline:
- `PeopleService` validates that `job.company_id` matches `people.company_id`
- `ProcessService` validates tasks and jobs exist before workflow creation
- `JobService` validates company and function relationships

---

## 6. Critical Dependencies and Coupling

### High Coupling Points

#### **1. Company-Centric Model**
Almost all entities have `company_id` foreign key:
- Acts as multi-tenant partition key
- Creates tight coupling across all domains

#### **2. Cross-Domain Validations**
- People creation validates Job existence and Company match
- Process creation validates Task and Job existence
- Job creation validates Function and Company relationship

#### **3. Hierarchical Relationships**
- Function → parent Function (organizational hierarchy)
- Process → parent Process (process decomposition)
- Task → Process (optional parent)

#### **4. Complex Many-to-Many Relationships**
- `job_task`: Jobs assigned to Tasks
- `job_skill`: Jobs requiring Skills
- `task_skill`: Tasks requiring Skills
- `process_task`: Process workflow steps
- `table_job`: Workspace assignments

---

## 7. Current Challenges for Microservices Migration

### 1. **Shared Database Dependencies**
All services read/write to single database, creating distributed transaction challenges.

### 2. **Foreign Key Constraints**
Strict referential integrity across domain boundaries prevents independent deployments.

### 3. **Transaction Boundaries**
Complex workflows span multiple domains (e.g., Process creation touches Company, Task, Job, process_task, job_task).

### 4. **Data Consistency**
Validation logic assumes immediate consistency (e.g., checking job.company_id in same transaction).

### 5. **No API Contracts**
Internal communication via direct TypeScript imports, not versioned APIs.

---

## 8. Current Strengths

### 1. **Well-Defined Domains**
Clear separation of concerns in module structure (Company, People, Job, Process, etc.)

### 2. **Strong Type Safety**
Prisma provides full TypeScript type safety across data layer

### 3. **Consistent Patterns**
Service classes follow consistent CRUD + relations patterns

### 4. **Transaction Safety**
`executeWithRetry` wrapper handles deadlocks and timeouts gracefully

### 5. **Validation Layer**
DTOs with class-validator provide robust input validation

---

## 9. Key Metrics

| Metric | Value |
|--------|-------|
| **Total Models** | 23 database tables |
| **NestJS Modules** | 16 functional modules |
| **Domain Boundaries** | 6 major domains identified |
| **Foreign Key Relationships** | 25+ FK constraints |
| **Many-to-Many Tables** | 5 association tables |
| **Hierarchical Models** | 3 (Function, Process, Task) |
| **Multi-Tenancy** | Company-based partitioning |

---

## 10. Recommendations for Migration

### Immediate Actions
1. **Document API Contracts**: Define explicit DTOs for cross-service communication
2. **Identify Bounded Contexts**: Map domain models to service boundaries
3. **Plan Data Ownership**: Assign each table to exactly one service
4. **Design Event Schema**: Define domain events for async communication

### Strategic Priorities
1. **Start with Auth Service**: Extract authentication as first independent service
2. **Separate Company/Org Management**: Create organization management service
3. **Isolate Physical Infrastructure**: Building/Floor/Room/Table can be independent
4. **Decompose Workforce Domain**: People + Job + Function into HR service
5. **Extract Process Management**: Process + Task as workflow service

---

**Next Document**: `02_MICROSERVICES_DECOMPOSITION_STRATEGY.md`
