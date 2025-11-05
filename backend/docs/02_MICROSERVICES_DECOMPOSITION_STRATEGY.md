# Microservices Decomposition Strategy

## Executive Summary
This document proposes the decomposition of the Digital Twin monolith into **7 core microservices** plus an API Gateway, based on domain-driven design principles and bounded contexts.

---

## 1. Proposed Microservice Architecture

### Service Inventory

| # | Service Name | Domain Responsibility | Scalability Priority |
|---|--------------|----------------------|---------------------|
| 1 | **Auth Service** | Authentication, Authorization, User Management | High |
| 2 | **Organization Service** | Company, Organization Types, Multi-tenancy | Medium |
| 3 | **HR Service** | People, Jobs, Functions, Workforce Management | High |
| 4 | **Process Service** | Business Processes, Tasks, Workflows | High |
| 5 | **Infrastructure Service** | Buildings, Floors, Rooms, Tables | Medium |
| 6 | **Skills Service** | Skills Catalog, Skill Levels, Competency Management | Low |
| 7 | **Integration Service** | Import/Export, Data Migration, Bulk Operations | Low |
| 8 | **API Gateway** | Routing, Auth, Aggregation, Rate Limiting | Critical |

---

## 2. Detailed Service Specifications

### 2.1 Auth Service

**Domain Responsibility**: Identity & Access Management

**Core Models** (from Prisma):
- `user`
- `role`

**Primary Functions**:
- User registration and authentication
- JWT token issuance and validation
- Role-based access control (RBAC)
- Password management and security
- Session management

**Key Operations**:
```
POST   /auth/register
POST   /auth/login
POST   /auth/refresh
GET    /auth/verify
POST   /auth/logout
GET    /roles
POST   /roles (SUPER_ADMIN only)
```

**Communication with Other Services**:
- **Organization Service**: Validates `company_id` when assigning users
- **All Services**: Publishes `UserCreated`, `UserRoleChanged` events

**Scalability Benefit**:
- Independent scaling for authentication traffic
- Centralized security updates
- Easier integration with OAuth/SAML providers
- Dedicated caching for sessions

**Database Tables**: `user`, `role`

---

### 2.2 Organization Service

**Domain Responsibility**: Organizational Structure & Multi-Tenancy

**Core Models**:
- `company`
- `OrganizationType`

**Primary Functions**:
- Company/tenant creation and management
- Organization type classification
- Company metadata and settings
- Tenant isolation enforcement

**Key Operations**:
```
POST   /companies
GET    /companies
GET    /companies/:id
PUT    /companies/:id
DELETE /companies/:id
GET    /organization-types
POST   /organization-types
```

**Communication with Other Services**:
- **All Services**: Validates company existence for tenant isolation
- Publishes: `CompanyCreated`, `CompanyUpdated`, `CompanyDeleted` events
- Subscribes: None (root domain)

**Scalability Benefit**:
- Lightweight service for core tenant management
- Can cache company data aggressively
- Easy to add tenant-specific configurations

**Database Tables**: `company`, `OrganizationType`

---

### 2.3 HR Service (Human Resources)

**Domain Responsibility**: Workforce & Organizational Structure

**Core Models**:
- `people`
- `job`
- `job_level`
- `Function`
- `job_skill` (association)
- `table_job` (association)

**Primary Functions**:
- Employee/people management
- Job position definitions
- Organizational function/department hierarchy
- Workforce assignments
- Job-skill requirements mapping
- Workspace (table) assignments

**Key Operations**:
```
# People
POST   /people
GET    /people?company_id=X
GET    /people/:id
PUT    /people/:id
DELETE /people/:id

# Jobs
POST   /jobs
GET    /jobs?company_id=X
GET    /jobs/:id
PUT    /jobs/:id
DELETE /jobs/:id
POST   /jobs/:id/skills
DELETE /jobs/:id/skills/:skillId

# Functions
POST   /functions
GET    /functions?company_id=X
GET    /functions/:id (with hierarchy)
PUT    /functions/:id
DELETE /functions/:id
```

**Communication with Other Services**:
- **Organization Service**: Validates company existence
- **Skills Service**: Fetches skill definitions for job requirements
- **Infrastructure Service**: Receives workspace availability
- **Process Service**: Provides job information for task assignments
- Publishes: `PersonCreated`, `JobCreated`, `JobSkillsUpdated`, `EmployeeAssigned`
- Subscribes: `CompanyCreated`, `CompanyDeleted`, `SkillCreated`

**Scalability Benefit**:
- High-traffic service (frequent reads for org charts, people lookups)
- Can implement read replicas
- Caching for function hierarchy

**Database Tables**: `people`, `job`, `job_level`, `Function`, `job_skill`, `table_job`

---

### 2.4 Process Service

**Domain Responsibility**: Business Process & Workflow Management

**Core Models**:
- `process`
- `task`
- `process_task` (association)
- `task_skill` (association)
- `job_task` (association)

**Primary Functions**:
- Business process definition (hierarchical)
- Task management
- Workflow orchestration (process → tasks → jobs)
- Capacity planning
- Task-skill requirements

**Key Operations**:
```
# Processes
POST   /processes
GET    /processes?company_id=X
GET    /processes/:id
PUT    /processes/:id
DELETE /processes/:id
GET    /processes/:id/workflow

# Tasks
POST   /tasks
GET    /tasks?company_id=X
GET    /tasks/:id
PUT    /tasks/:id
DELETE /tasks/:id
POST   /tasks/:id/skills

# Workflows
POST   /processes/:id/workflow (assign tasks with order)
PUT    /processes/:id/workflow
```

**Communication with Other Services**:
- **Organization Service**: Validates company
- **HR Service**: Validates job assignments for tasks
- **Skills Service**: Validates task skill requirements
- Publishes: `ProcessCreated`, `TaskCreated`, `WorkflowUpdated`, `ProcessCompleted`
- Subscribes: `CompanyDeleted`, `JobDeleted`, `SkillDeleted`

**Scalability Benefit**:
- Complex computational service (capacity calculations, workflow optimization)
- Can scale horizontally for process simulations
- Future AI/ML integration for process suggestions

**Database Tables**: `process`, `task`, `process_task`, `task_skill`, `job_task`

---

### 2.5 Infrastructure Service

**Domain Responsibility**: Physical Asset & Facility Management

**Core Models**:
- `building`
- `building_cell`
- `floor`
- `room`
- `table`

**Primary Functions**:
- Building and facility management
- Floor plan management
- Room and workspace allocation
- Grid-based layout management
- Capacity tracking

**Key Operations**:
```
# Buildings
POST   /buildings
GET    /buildings?company_id=X
GET    /buildings/:id
PUT    /buildings/:id
DELETE /buildings/:id

# Floors
POST   /buildings/:buildingId/floors
GET    /floors?building_id=X
PUT    /floors/:id
DELETE /floors/:id

# Rooms
POST   /floors/:floorId/rooms
GET    /rooms?floor_id=X
PUT    /rooms/:id

# Tables
POST   /rooms/:roomId/tables
GET    /tables?room_id=X
PUT    /tables/:id
```

**Communication with Other Services**:
- **Organization Service**: Validates company
- **HR Service**: Receives job assignments for tables
- Publishes: `BuildingCreated`, `WorkspaceAvailable`, `CapacityChanged`
- Subscribes: `CompanyDeleted`, `JobDeleted`

**Scalability Benefit**:
- Visual/3D rendering offload (Unity integration)
- Spatial queries and calculations
- Can add geospatial features

**Database Tables**: `building`, `building_cell`, `floor`, `room`, `table`

---

### 2.6 Skills Service

**Domain Responsibility**: Skills Catalog & Competency Framework

**Core Models**:
- `skill`
- `skill_level`

**Primary Functions**:
- Centralized skills taxonomy
- Skill level definitions
- Competency framework
- Skill recommendations (future: AI-powered)

**Key Operations**:
```
GET    /skills
POST   /skills
GET    /skills/:id
PUT    /skills/:id
DELETE /skills/:id
GET    /skill-levels
```

**Communication with Other Services**:
- **HR Service**: Provides skill data for job requirements
- **Process Service**: Provides skill data for task requirements
- Publishes: `SkillCreated`, `SkillUpdated`, `SkillDeleted`
- Subscribes: None (reference data service)

**Scalability Benefit**:
- Read-heavy, cache-friendly
- Future integration with external skill databases
- AI-powered skill gap analysis

**Database Tables**: `skill`, `skill_level`

---

### 2.7 Integration Service

**Domain Responsibility**: Data Import/Export & Bulk Operations

**Core Models**: None (orchestration service)

**Primary Functions**:
- Bulk data import (XLSX, CSV)
- Data export and reporting
- Cross-service data synchronization
- Migration utilities
- Batch processing

**Key Operations**:
```
POST   /import/companies (multipart/form-data)
POST   /import/people
POST   /import/processes
GET    /export/company/:id (full data dump)
POST   /bulk/operations
GET    /migration/status
```

**Communication with Other Services**:
- **All Services**: Calls APIs to bulk create/update entities
- Acts as orchestrator for complex multi-service operations
- Publishes: `ImportCompleted`, `ExportReady`, `BatchProcessCompleted`

**Scalability Benefit**:
- Async job processing (background workers)
- Queue-based architecture
- Doesn't block other services

**Database Tables**: None (may have job tracking table)

---

## 3. Service Boundaries & Ownership

### Data Ownership Matrix

| Domain Entity | Owned By Service | Accessed By |
|---------------|------------------|-------------|
| user, role | Auth Service | All (via API/Events) |
| company, OrganizationType | Organization Service | All (via API) |
| people, job, Function | HR Service | Process, Infrastructure |
| process, task | Process Service | HR (for jobs) |
| building, floor, room, table | Infrastructure Service | HR (for assignments) |
| skill, skill_level | Skills Service | HR, Process |
| job_skill | HR Service | Skills Service (read-only) |
| task_skill | Process Service | Skills Service (read-only) |
| process_task | Process Service | - |
| job_task | Process Service | HR Service (read) |
| table_job | Infrastructure Service | HR Service (write) |

### Ownership Principles
1. **Single Writer**: Only the owning service can CREATE/UPDATE/DELETE
2. **Read via API**: Other services read via REST/gRPC, not direct DB
3. **Events for Changes**: Owning service publishes domain events
4. **Eventual Consistency**: Accept delayed propagation for non-critical reads

---

## 4. Service Interaction Patterns

### Pattern 1: Synchronous Validation (REST/gRPC)
**Use Case**: Critical validations before operations
**Example**: HR Service validates company exists before creating job
```
HR Service → Organization Service: GET /companies/:id
             ← 200 OK / 404 Not Found
```

### Pattern 2: Asynchronous Events (Message Broker)
**Use Case**: Data propagation, notifications
**Example**: Company deleted → cascade to other services
```
Organization Service → EventBus: CompanyDeleted { companyId: 123 }
                      → HR Service: (listener) Delete all jobs/people for company 123
                      → Process Service: (listener) Delete all processes for company 123
```

### Pattern 3: API Aggregation (API Gateway)
**Use Case**: Client needs data from multiple services
**Example**: Get company with full org chart
```
Client → API Gateway: GET /companies/:id/full
       → Organization Service: GET /companies/:id
       → HR Service: GET /functions?company_id=:id
       → HR Service: GET /people?company_id=:id
       ← Aggregated response
```

### Pattern 4: Saga Pattern (Distributed Transactions)
**Use Case**: Multi-service workflows
**Example**: Import company with employees, processes
```
Integration Service (Orchestrator):
  1. Create Company (Organization Service)
  2. Create Functions (HR Service)
  3. Create Jobs (HR Service)
  4. Create Processes (Process Service)
  5. Create People (HR Service)
  [Rollback on any failure]
```

---

## 5. Service Size & Complexity

| Service | Estimated LOC | Complexity | Team Assignment |
|---------|---------------|------------|-----------------|
| Auth Service | ~2,000 | Low | Backend Team A |
| Organization Service | ~1,500 | Low | Backend Team A |
| HR Service | ~5,000 | High | Backend Team B |
| Process Service | ~4,500 | High | Backend Team C |
| Infrastructure Service | ~3,500 | Medium | Backend Team B |
| Skills Service | ~1,000 | Low | Backend Team A |
| Integration Service | ~2,500 | Medium | Backend Team C |
| API Gateway | ~1,500 | Medium | DevOps + Backend Lead |

---

**Next Document**: `03_SERVICE_COMMUNICATION_ARCHITECTURE.md`
