# Database-per-Service Strategy

## Executive Summary
This document outlines the database decomposition strategy, addressing data ownership, schema separation, and managing cross-service data consistency.

---

## 1. Database Architecture Overview

### Current State: Monolithic Database
- **Single MySQL Database**: All 23 tables in one schema
- **Shared Access**: All modules use same PrismaClient instance
- **Strong Consistency**: ACID transactions across all entities
- **Foreign Key Constraints**: 25+ cross-table relationships

### Target State: Database-per-Service
- **7 Separate Databases**: One per microservice
- **Service-Owned Data**: Each service exclusively manages its schema
- **Eventual Consistency**: Cross-service data synchronization via events
- **No Shared Database Access**: Services communicate via APIs only

---

## 2. Database Allocation Matrix

| Service | Database Name | Tables | Size Estimate | IOPS Profile |
|---------|---------------|--------|---------------|--------------|
| **Auth Service** | `auth_db` | user, role | Small (~10K users) | Low-Medium |
| **Organization Service** | `organization_db` | company, OrganizationType | Small (~1K companies) | Low |
| **HR Service** | `hr_db` | people, job, job_level, Function, job_skill, table_job | Large (~100K people) | High |
| **Process Service** | `process_db` | process, task, process_task, task_skill, job_task | Medium (~50K tasks) | Medium |
| **Infrastructure Service** | `infrastructure_db` | building, building_cell, floor, room, table | Medium (~10K buildings) | Medium |
| **Skills Service** | `skills_db` | skill, skill_level | Small (~5K skills) | Low |
| **Integration Service** | `integration_db` | import_jobs, export_logs | Medium (logs) | Medium |

---

## 3. Detailed Schema Decomposition

### 3.1 Auth Service Database (`auth_db`)

**Tables**:
```sql
-- user table
CREATE TABLE user (
  user_id INT PRIMARY KEY AUTO_INCREMENT,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role_id INT NOT NULL,
  company_id INT NULL,  -- Reference only, not FK
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (email),
  INDEX idx_company_id (company_id),
  INDEX idx_role_id (role_id)
);

-- role table
CREATE TABLE role (
  role_id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  INDEX idx_name (name)
);
```

**Key Changes**:
- ❌ Removed FK: `company_id` → `company.company_id`
- ❌ Removed FK: `role_id` → `role.role_id` (kept local FK since role is in same service)
- ✅ Keep: `role_id` FK to local `role` table

**Data Validation**:
- Validate `company_id` exists via REST call to Organization Service before creating user
- Cache company validation results (TTL: 5 minutes)

---

### 3.2 Organization Service Database (`organization_db`)

**Tables**:
```sql
-- company table
CREATE TABLE company (
  company_id INT PRIMARY KEY AUTO_INCREMENT,
  company_code VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  created_by INT NOT NULL,  -- Reference only, not FK
  org_type_id INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_code (company_code),
  INDEX idx_org_type (org_type_id)
);

-- OrganizationType table
CREATE TABLE organization_type (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  INDEX idx_name (name)
);
```

**Key Changes**:
- ❌ Removed FK: `created_by` → `user.user_id`
- ✅ Keep: `org_type_id` FK to local `organization_type` table

**Data Validation**:
- Validate `created_by` user exists via REST call to Auth Service
- Store user info as denormalized data for audit purposes

---

### 3.3 HR Service Database (`hr_db`)

**Tables**:
```sql
-- people table
CREATE TABLE people (
  people_id INT PRIMARY KEY AUTO_INCREMENT,
  company_id INT NOT NULL,  -- Reference only
  job_id INT NOT NULL,
  people_email VARCHAR(255) UNIQUE NOT NULL,
  people_name VARCHAR(255) NOT NULL,
  people_surname VARCHAR(255) NOT NULL,
  people_phone VARCHAR(50),
  is_manager BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_company (company_id),
  INDEX idx_job (job_id),
  INDEX idx_email (people_email)
);

-- job table
CREATE TABLE job (
  job_id INT PRIMARY KEY AUTO_INCREMENT,
  job_code VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  overview TEXT,
  company_id INT NOT NULL,  -- Reference only
  function_id INT NOT NULL,
  job_level_id INT NOT NULL,
  hourly_rate DECIMAL(10,2) NOT NULL,
  max_hours_per_day DECIMAL(5,2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_company (company_id),
  INDEX idx_function (function_id),
  INDEX idx_level (job_level_id)
);

-- Function table (organizational departments)
CREATE TABLE function (
  function_id INT PRIMARY KEY AUTO_INCREMENT,
  function_code VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  overview TEXT,
  company_id INT NOT NULL,  -- Reference only
  parent_function_id INT NULL,
  background_color VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_company (company_id),
  INDEX idx_parent (parent_function_id)
);

-- job_level table
CREATE TABLE job_level (
  id INT PRIMARY KEY AUTO_INCREMENT,
  level_name ENUM('NOVICE','INTERMEDIATE','PROFICIENT','ADVANCED','EXPERT') UNIQUE NOT NULL,
  level_rank INT UNIQUE,
  description TEXT
);

-- job_skill junction table
CREATE TABLE job_skill (
  job_id INT NOT NULL,
  skill_id INT NOT NULL,  -- Reference to Skills Service
  skill_level_id INT NOT NULL,  -- Reference to Skills Service
  PRIMARY KEY (job_id, skill_id),
  INDEX idx_skill (skill_id)
);

-- table_job junction table
CREATE TABLE table_job (
  table_id INT NOT NULL,  -- Reference to Infrastructure Service
  job_id INT NOT NULL,
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (table_id, job_id),
  INDEX idx_table (table_id)
);
```

**Key Changes**:
- ❌ Removed FK: `company_id` in all tables
- ❌ Removed FK: `skill_id`, `skill_level_id` in `job_skill`
- ❌ Removed FK: `table_id` in `table_job`
- ✅ Keep: Local FKs within service (e.g., `job_id` → `job`, `function_id` → `function`)

**Data Validation**:
- Validate `company_id` via Organization Service
- Validate `skill_id` via Skills Service before creating `job_skill`
- Validate `table_id` via Infrastructure Service before creating `table_job`

**Denormalization Strategy**:
- Cache skill names in `job_skill` table for read performance
- Cache company names for display purposes

---

### 3.4 Process Service Database (`process_db`)

**Tables**:
```sql
-- process table
CREATE TABLE process (
  process_id INT PRIMARY KEY AUTO_INCREMENT,
  process_code VARCHAR(100) UNIQUE NOT NULL,
  process_name VARCHAR(255) NOT NULL,
  process_overview TEXT NOT NULL,
  company_id INT NOT NULL,  -- Reference only
  parent_process_id INT NULL,
  parent_task_id INT NULL,
  capacity_requirement_minutes INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_company (company_id),
  INDEX idx_parent_process (parent_process_id),
  INDEX idx_parent_task (parent_task_id)
);

-- task table
CREATE TABLE task (
  task_id INT PRIMARY KEY AUTO_INCREMENT,
  task_code VARCHAR(100) UNIQUE NOT NULL,
  task_name VARCHAR(255) NOT NULL,
  task_overview TEXT NOT NULL,
  task_capacity_minutes INT NOT NULL,
  task_company_id INT NOT NULL,  -- Reference only
  task_process_id INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_company (task_company_id),
  INDEX idx_process (task_process_id)
);

-- process_task junction table
CREATE TABLE process_task (
  process_id INT NOT NULL,
  task_id INT NOT NULL,
  order INT NOT NULL,
  PRIMARY KEY (process_id, task_id),
  INDEX idx_order (process_id, order)
);

-- task_skill junction table
CREATE TABLE task_skill (
  task_skill_task_id INT NOT NULL,
  task_skill_skill_id INT NOT NULL,  -- Reference only
  task_skill_level_id INT NOT NULL,  -- Reference only
  skill_name VARCHAR(255),  -- Denormalized
  PRIMARY KEY (task_skill_task_id, task_skill_skill_id),
  INDEX idx_skill (task_skill_skill_id)
);

-- job_task junction table
CREATE TABLE job_task (
  job_id INT NOT NULL,  -- Reference to HR Service
  task_id INT NOT NULL,
  PRIMARY KEY (job_id, task_id),
  INDEX idx_job (job_id)
);
```

**Key Changes**:
- ❌ Removed FK: `company_id` references
- ❌ Removed FK: `job_id` in `job_task`
- ❌ Removed FK: `skill_id`, `skill_level_id` in `task_skill`
- ✅ Keep: Local FKs (process ↔ task relationships)

---

### 3.5 Infrastructure Service Database (`infrastructure_db`)

**Tables**:
```sql
-- building table
CREATE TABLE building (
  building_id INT PRIMARY KEY AUTO_INCREMENT,
  building_code VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  company_id INT NOT NULL,  -- Reference only
  city VARCHAR(100),
  country VARCHAR(100),
  rows INT DEFAULT 1,
  columns INT DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_company (company_id),
  INDEX idx_code (building_code)
);

-- building_cell table
CREATE TABLE building_cell (
  id INT PRIMARY KEY AUTO_INCREMENT,
  building_id INT NOT NULL,
  row INT NOT NULL,
  column INT NOT NULL,
  type ENUM('EMPTY','ELEVATOR','STAIRS') DEFAULT 'EMPTY',
  UNIQUE KEY unique_cell (building_id, row, column),
  FOREIGN KEY (building_id) REFERENCES building(building_id) ON DELETE CASCADE
);

-- floor table
CREATE TABLE floor (
  floor_id INT PRIMARY KEY AUTO_INCREMENT,
  floor_code VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  building_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (building_id) REFERENCES building(building_id) ON DELETE CASCADE,
  INDEX idx_building (building_id)
);

-- room table
CREATE TABLE room (
  room_id INT PRIMARY KEY AUTO_INCREMENT,
  room_code VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  floor_id INT NOT NULL,
  row INT NOT NULL,
  column INT NOT NULL,
  cell_type ENUM('EMPTY','ELEVATOR','STAIRS') DEFAULT 'EMPTY',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_room_pos (floor_id, row, column),
  FOREIGN KEY (floor_id) REFERENCES floor(floor_id) ON DELETE CASCADE,
  INDEX idx_floor (floor_id)
);

-- table (workstation) table
CREATE TABLE workstation_table (
  table_id INT PRIMARY KEY AUTO_INCREMENT,
  table_code VARCHAR(100) NOT NULL,
  name VARCHAR(255) NOT NULL,
  room_id INT NOT NULL,
  capacity INT DEFAULT 1,
  orientation ENUM('HORIZONTAL','VERTICAL') DEFAULT 'HORIZONTAL',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_table_code (room_id, table_code),
  FOREIGN KEY (room_id) REFERENCES room(room_id) ON DELETE CASCADE,
  INDEX idx_room (room_id)
);
```

**Key Changes**:
- ❌ Removed FK: `company_id` in `building`
- ✅ Keep: Entire cascade chain (building → floor → room → table)

---

### 3.6 Skills Service Database (`skills_db`)

**Tables**:
```sql
-- skill table
CREATE TABLE skill (
  skill_id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  INDEX idx_name (name)
);

-- skill_level table
CREATE TABLE skill_level (
  id INT PRIMARY KEY AUTO_INCREMENT,
  level_name ENUM('NOVICE','INTERMEDIATE','PROFICIENT','ADVANCED','EXPERT') NOT NULL,
  level_rank INT UNIQUE,
  description TEXT,
  INDEX idx_rank (level_rank)
);
```

**No Changes**: This service is self-contained

---

### 3.7 Integration Service Database (`integration_db`)

**New Tables for Job Tracking**:
```sql
-- import_job table
CREATE TABLE import_job (
  job_id VARCHAR(100) PRIMARY KEY,
  company_id INT NOT NULL,  -- Reference only
  type ENUM('COMPANY','PEOPLE','PROCESS','FULL') NOT NULL,
  status ENUM('PENDING','PROCESSING','COMPLETED','FAILED') DEFAULT 'PENDING',
  file_path VARCHAR(500),
  total_records INT DEFAULT 0,
  processed_records INT DEFAULT 0,
  failed_records INT DEFAULT 0,
  error_log TEXT,
  created_by INT NOT NULL,  -- Reference only
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP NULL,
  INDEX idx_company (company_id),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at)
);

-- export_log table
CREATE TABLE export_log (
  export_id VARCHAR(100) PRIMARY KEY,
  company_id INT NOT NULL,
  type VARCHAR(100) NOT NULL,
  file_url VARCHAR(500),
  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_company (company_id)
);
```

---

## 4. Handling Foreign Key Relationships

### Strategy: Replace FKs with Validation + Events

#### Before (Monolith):
```typescript
// Direct FK enforcement at database level
await prisma.people.create({
  data: {
    people_email: 'john@example.com',
    company: { connect: { company_id: 123 } },  // FK validated by DB
    job: { connect: { job_id: 456 } }             // FK validated by DB
  }
});
```

#### After (Microservices):
```typescript
// Service-level validation before insert
@Injectable()
export class PeopleService {
  constructor(
    private prisma: PrismaService,
    @Inject('ORGANIZATION_CLIENT') private orgClient: ClientProxy,
    @Inject('HR_CLIENT') private hrClient: ClientProxy
  ) {}

  async create(dto: CreatePeopleDto) {
    // 1. Validate company exists (sync call to Organization Service)
    const companyExists = await firstValueFrom(
      this.orgClient.send('validate.company', { companyId: dto.company_id })
    );
    if (!companyExists) {
      throw new BadRequestException('Company not found');
    }

    // 2. Validate job exists and belongs to same company (local call within HR Service)
    const job = await this.prisma.job.findUnique({
      where: { job_id: dto.job_id }
    });
    if (!job) {
      throw new NotFoundException('Job not found');
    }
    if (job.company_id !== dto.company_id) {
      throw new BadRequestException('Job does not belong to the specified company');
    }

    // 3. Create person
    return this.prisma.people.create({
      data: {
        people_email: dto.email,
        company_id: dto.company_id,  // Just a reference now
        job_id: dto.job_id,
        // ... other fields
      }
    });
  }
}
```

---

## 5. Data Synchronization Patterns

### Pattern 1: Reference Data Caching
Cache frequently accessed reference data from other services:

```typescript
// HR Service caches company names
@Injectable()
export class CompanyCacheService {
  private cache = new Map<number, { name: string; expiry: number }>();

  async getCompanyName(companyId: number): Promise<string> {
    const cached = this.cache.get(companyId);
    if (cached && cached.expiry > Date.now()) {
      return cached.name;
    }

    // Fetch from Organization Service
    const company = await firstValueFrom(
      this.orgClient.send('get.company', { companyId })
    );
    
    this.cache.set(companyId, {
      name: company.name,
      expiry: Date.now() + 5 * 60 * 1000  // 5 minutes TTL
    });
    
    return company.name;
  }

  @OnEvent('organization.company.updated')
  handleCompanyUpdated(event: DomainEvent) {
    // Invalidate cache on update
    this.cache.delete(event.payload.companyId);
  }
}
```

### Pattern 2: Event-Driven Denormalization
Store copies of frequently needed data:

```typescript
// HR Service stores denormalized skill names
CREATE TABLE job_skill (
  job_id INT NOT NULL,
  skill_id INT NOT NULL,
  skill_level_id INT NOT NULL,
  skill_name VARCHAR(255),  -- Denormalized from Skills Service
  skill_level_name VARCHAR(50),  -- Denormalized
  PRIMARY KEY (job_id, skill_id)
);

// Event listener in HR Service
@EventPattern('skills.skill.updated')
async handleSkillUpdated(event: DomainEvent) {
  const { skillId, newName } = event.payload;
  
  // Update denormalized data
  await this.prisma.$executeRaw`
    UPDATE job_skill 
    SET skill_name = ${newName}
    WHERE skill_id = ${skillId}
  `;
}
```

---

## 6. Cascade Delete Strategy

### Monolith Approach (Before):
```sql
-- Database-level cascades
ALTER TABLE people ADD CONSTRAINT fk_company 
  FOREIGN KEY (company_id) REFERENCES company(company_id) 
  ON DELETE CASCADE;
```

### Microservices Approach (After):
```typescript
// Organization Service publishes event
async deleteCompany(companyId: number) {
  await this.prisma.company.delete({ where: { company_id: companyId } });
  
  // Publish cascade event
  this.eventBus.emit('organization.company.deleted', {
    eventId: uuidv4(),
    eventType: 'organization.company.deleted',
    payload: { companyId }
  });
}

// HR Service subscribes and cascades
@EventPattern('organization.company.deleted')
async handleCompanyDeleted(event: DomainEvent) {
  const { companyId } = event.payload;
  
  await this.prisma.$transaction([
    this.prisma.job_skill.deleteMany({ where: { job: { company_id: companyId } } }),
    this.prisma.table_job.deleteMany({ where: { job: { company_id: companyId } } }),
    this.prisma.people.deleteMany({ where: { company_id: companyId } }),
    this.prisma.job.deleteMany({ where: { company_id: companyId } }),
    this.prisma.function.deleteMany({ where: { company_id: companyId } })
  ]);
  
  console.log(`Cleaned up HR data for deleted company ${companyId}`);
}
```

---

## 7. Data Consistency Guarantees

### Strong Consistency (Within Service)
- Use database transactions for multi-table operations within same service
- Example: Creating a process with tasks in Process Service

### Eventual Consistency (Cross-Service)
- Accept delay in propagation (typically < 1 second)
- Example: Company name update reflects in HR Service after event processing

### Compensating Transactions
- Handle failures in distributed operations
- Example: Saga pattern for complex imports

---

## 8. Migration Steps for Database Split

### Step 1: Add Service Identifiers
```sql
-- Tag each table with intended service
ALTER TABLE user ADD COLUMN _service VARCHAR(50) DEFAULT 'auth';
ALTER TABLE company ADD COLUMN _service VARCHAR(50) DEFAULT 'organization';
-- ... for all tables
```

### Step 2: Create New Databases
```bash
mysql -u root -p
CREATE DATABASE auth_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE organization_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE hr_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
# ... create all service databases
```

### Step 3: Export/Import Data by Service
```bash
# Export auth tables
mysqldump monolith_db user role > auth_data.sql

# Import to auth_db
mysql -u root -p auth_db < auth_data.sql
```

### Step 4: Remove Foreign Key Constraints
```sql
-- In each new database, drop cross-service FKs
ALTER TABLE user DROP FOREIGN KEY user_company_id_fkey;
ALTER TABLE people DROP FOREIGN KEY people_company_id_fkey;
```

### Step 5: Update Application Connection Strings
```env
# .env for HR Service
DATABASE_URL="mysql://user:pass@localhost:3306/hr_db"

# .env for Organization Service
DATABASE_URL="mysql://user:pass@localhost:3306/organization_db"
```

---

**Next Document**: `05_API_GATEWAY_ARCHITECTURE.md`
