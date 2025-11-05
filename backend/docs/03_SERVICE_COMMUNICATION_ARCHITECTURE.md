# Service Communication Architecture

## Executive Summary
This document defines the communication strategies, protocols, and event-driven patterns for inter-service communication in the microservices architecture.

---

## 1. Communication Strategy Overview

### Communication Modes

| Mode | Protocol | Use Case | Latency | Consistency |
|------|----------|----------|---------|-------------|
| **Synchronous** | REST/HTTP | CRUD operations, validations | Low | Strong |
| **Synchronous** | gRPC | High-performance internal calls | Very Low | Strong |
| **Asynchronous** | RabbitMQ/NATS | Events, notifications, data sync | High | Eventual |
| **Asynchronous** | Kafka (future) | Event sourcing, audit logs | High | Eventual |

---

## 2. REST API Communication

### When to Use REST
- Client-facing operations (via API Gateway)
- Simple CRUD operations
- Validation checks (e.g., "Does company exist?")
- External system integrations
- Service health checks

### REST Standards

**Protocol**: HTTP/1.1 or HTTP/2
**Format**: JSON
**Authentication**: JWT Bearer tokens
**Versioning**: URL-based (`/v1/companies`)

### Example REST Flows

#### Flow 1: Create Person (HR Service needs to validate Company)
```http
# HR Service → Organization Service
GET /v1/companies/123 HTTP/1.1
Host: organization-service:3000
Authorization: Bearer <internal-service-token>

Response:
HTTP/1.1 200 OK
{
  "company_id": 123,
  "name": "Acme Corp",
  "organizationType": { "id": 1, "name": "Functional" }
}

# If company doesn't exist:
HTTP/1.1 404 Not Found
{
  "error": "Company not found",
  "code": "COMPANY_NOT_FOUND"
}
```

#### Flow 2: Get Job with Skills (HR Service → Skills Service)
```http
# HR Service → Skills Service
GET /v1/skills?ids=1,2,3 HTTP/1.1
Host: skills-service:3000

Response:
HTTP/1.1 200 OK
{
  "skills": [
    { "skill_id": 1, "name": "JavaScript", "description": "..." },
    { "skill_id": 2, "name": "TypeScript", "description": "..." },
    { "skill_id": 3, "name": "NestJS", "description": "..." }
  ]
}
```

### REST Error Handling
All services return consistent error format:
```json
{
  "error": "Resource not found",
  "code": "RESOURCE_NOT_FOUND",
  "statusCode": 404,
  "timestamp": "2025-10-30T12:31:00Z",
  "path": "/v1/companies/999",
  "details": { "companyId": 999 }
}
```

---

## 3. gRPC Communication

### When to Use gRPC
- High-frequency internal service calls
- Performance-critical operations
- Streaming data (e.g., real-time updates)
- Type-safe internal contracts

### gRPC Service Definitions

#### Example: Organization Service
```protobuf
// organization.proto
syntax = "proto3";

package organization;

service OrganizationService {
  rpc GetCompany(GetCompanyRequest) returns (Company);
  rpc ValidateCompany(ValidateCompanyRequest) returns (ValidationResponse);
  rpc ListCompanies(ListCompaniesRequest) returns (CompanyList);
}

message GetCompanyRequest {
  int32 company_id = 1;
}

message Company {
  int32 company_id = 1;
  string name = 2;
  string company_code = 3;
  int32 organization_type_id = 4;
  string created_at = 5;
}

message ValidateCompanyRequest {
  int32 company_id = 1;
}

message ValidationResponse {
  bool exists = 1;
  bool is_active = 2;
}
```

#### Example: Skills Service
```protobuf
// skills.proto
syntax = "proto3";

package skills;

service SkillsService {
  rpc GetSkill(GetSkillRequest) returns (Skill);
  rpc GetSkillsByIds(GetSkillsByIdsRequest) returns (SkillList);
  rpc ValidateSkills(ValidateSkillsRequest) returns (ValidationResponse);
}

message Skill {
  int32 skill_id = 1;
  string name = 2;
  string description = 3;
}

message GetSkillsByIdsRequest {
  repeated int32 skill_ids = 1;
}

message SkillList {
  repeated Skill skills = 1;
}
```

### gRPC Implementation in NestJS
```typescript
// organization.service.ts
@Injectable()
export class OrganizationGrpcService {
  @GrpcMethod('OrganizationService', 'GetCompany')
  async getCompany(data: GetCompanyRequest): Promise<Company> {
    const company = await this.prisma.company.findUnique({
      where: { company_id: data.company_id }
    });
    if (!company) throw new RpcException('Company not found');
    return company;
  }

  @GrpcMethod('OrganizationService', 'ValidateCompany')
  async validateCompany(data: ValidateCompanyRequest): Promise<ValidationResponse> {
    const exists = await this.prisma.company.count({
      where: { company_id: data.company_id }
    }) > 0;
    return { exists, is_active: true };
  }
}
```

---

## 4. Event-Driven Communication (Message Broker)

### When to Use Events
- Data synchronization across services
- Cascade operations (e.g., delete company → delete all related data)
- Notifications and alerts
- Audit logging
- Decoupling services

### Message Broker: RabbitMQ vs NATS

| Feature | RabbitMQ | NATS |
|---------|----------|------|
| **Performance** | ~50k msg/sec | ~1M+ msg/sec |
| **Persistence** | Yes | Optional (JetStream) |
| **Complexity** | Medium | Low |
| **Use Case** | Critical events, guaranteed delivery | High-throughput, real-time |
| **Recommendation** | **Primary choice** | Alternative for high-volume |

**Decision**: Use **RabbitMQ** with **NATS** as optional high-performance layer

---

## 5. Event Schema Design

### Event Naming Convention
```
<Domain>.<Entity>.<Action>
Examples:
- organization.company.created
- hr.person.updated
- process.workflow.completed
- auth.user.roleChanged
```

### Event Structure
```typescript
interface DomainEvent {
  eventId: string;           // UUID
  eventType: string;         // e.g., "organization.company.created"
  timestamp: string;         // ISO 8601
  version: string;           // e.g., "1.0"
  source: string;            // Service name
  correlationId?: string;    // For tracing related events
  payload: any;              // Event-specific data
  metadata?: Record<string, any>;
}
```

### Event Examples

#### 1. CompanyCreated Event
```json
{
  "eventId": "550e8400-e29b-41d4-a716-446655440000",
  "eventType": "organization.company.created",
  "timestamp": "2025-10-30T12:31:00Z",
  "version": "1.0",
  "source": "organization-service",
  "payload": {
    "companyId": 123,
    "companyCode": "ACME001",
    "name": "Acme Corporation",
    "organizationTypeId": 1,
    "createdBy": 1
  },
  "metadata": {
    "userId": 1,
    "ipAddress": "192.168.1.1"
  }
}
```

#### 2. CompanyDeleted Event (Cascade Trigger)
```json
{
  "eventId": "660e8400-e29b-41d4-a716-446655440001",
  "eventType": "organization.company.deleted",
  "timestamp": "2025-10-30T12:35:00Z",
  "version": "1.0",
  "source": "organization-service",
  "payload": {
    "companyId": 123,
    "companyCode": "ACME001",
    "deletedBy": 1
  }
}
```

**Subscribers**:
- HR Service: Delete all people, jobs, functions for company 123
- Process Service: Delete all processes, tasks for company 123
- Infrastructure Service: Delete all buildings for company 123

#### 3. PersonCreated Event
```json
{
  "eventId": "770e8400-e29b-41d4-a716-446655440002",
  "eventType": "hr.person.created",
  "timestamp": "2025-10-30T12:40:00Z",
  "version": "1.0",
  "source": "hr-service",
  "payload": {
    "peopleId": 456,
    "companyId": 123,
    "jobId": 789,
    "email": "john.doe@acme.com",
    "name": "John Doe",
    "isManager": false
  }
}
```

#### 4. JobSkillsUpdated Event
```json
{
  "eventId": "880e8400-e29b-41d4-a716-446655440003",
  "eventType": "hr.job.skillsUpdated",
  "timestamp": "2025-10-30T12:45:00Z",
  "version": "1.0",
  "source": "hr-service",
  "payload": {
    "jobId": 789,
    "companyId": 123,
    "addedSkills": [
      { "skillId": 1, "levelId": 3 },
      { "skillId": 5, "levelId": 4 }
    ],
    "removedSkills": [2, 3]
  }
}
```

#### 5. ProcessCompleted Event
```json
{
  "eventId": "990e8400-e29b-41d4-a716-446655440004",
  "eventType": "process.workflow.completed",
  "timestamp": "2025-10-30T13:00:00Z",
  "version": "1.0",
  "source": "process-service",
  "correlationId": "workflow-exec-12345",
  "payload": {
    "processId": 999,
    "companyId": 123,
    "executionId": "workflow-exec-12345",
    "duration": 3600,
    "tasksCompleted": 15
  }
}
```

---

## 6. RabbitMQ Exchange & Queue Design

### Exchange Strategy

**Exchange Type**: Topic Exchange (flexible routing)

```
Exchange: "digital-twin.events"
Type: topic
Durable: true
```

### Queue Naming Convention
```
<service-name>.<event-domain>.<event-entity>

Examples:
- hr-service.organization.company
- process-service.hr.job
- infrastructure-service.organization.company
```

### Routing Key Patterns
```
organization.company.created   → hr-service.organization.company
organization.company.created   → process-service.organization.company
organization.company.deleted   → hr-service.organization.company
hr.job.skillsUpdated           → process-service.hr.job
```

### RabbitMQ Configuration Example
```typescript
// event-bus.module.ts
@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'EVENT_BUS',
        transport: Transport.RMQ,
        options: {
          urls: [process.env.RABBITMQ_URL],
          queue: 'hr-service.organization.company',
          queueOptions: {
            durable: true,
            arguments: {
              'x-message-ttl': 86400000, // 24 hours
              'x-dead-letter-exchange': 'digital-twin.dlx'
            }
          },
          prefetchCount: 10,
        },
      },
    ]),
  ],
})
export class EventBusModule {}
```

---

## 7. Event Publishing Pattern

### Publisher Implementation
```typescript
// organization.service.ts
@Injectable()
export class OrganizationService {
  constructor(
    private prisma: PrismaService,
    @Inject('EVENT_BUS') private eventBus: ClientProxy
  ) {}

  async deleteCompany(companyId: number) {
    const company = await this.prisma.company.delete({
      where: { company_id: companyId }
    });

    // Publish event
    const event: DomainEvent = {
      eventId: uuidv4(),
      eventType: 'organization.company.deleted',
      timestamp: new Date().toISOString(),
      version: '1.0',
      source: 'organization-service',
      payload: {
        companyId: company.company_id,
        companyCode: company.companyCode
      }
    };

    await this.eventBus.emit('organization.company.deleted', event);
    return company;
  }
}
```

### Subscriber Implementation
```typescript
// hr.service.ts (listener)
@Controller()
export class HrEventController {
  constructor(private hrService: HrService) {}

  @EventPattern('organization.company.deleted')
  async handleCompanyDeleted(event: DomainEvent) {
    const { companyId } = event.payload;
    
    // Cascade delete all HR data for this company
    await this.hrService.deleteAllByCompany(companyId);
    
    console.log(`Cleaned up HR data for company ${companyId}`);
  }
}
```

---

## 8. Saga Pattern for Distributed Transactions

### Use Case: Import Company with Full Data

**Orchestrator**: Integration Service

**Steps**:
1. Create Company (Organization Service)
2. Create Functions (HR Service)
3. Create Jobs (HR Service)
4. Create Processes (Process Service)
5. Create People (HR Service)

### Saga Implementation
```typescript
// integration.service.ts
@Injectable()
export class IntegrationService {
  async importCompanyData(data: ImportDto): Promise<ImportResult> {
    const sagaId = uuidv4();
    const compensations = [];

    try {
      // Step 1: Create Company
      const company = await this.organizationClient.createCompany(data.company);
      compensations.push(() => this.organizationClient.deleteCompany(company.company_id));

      // Step 2: Create Functions
      const functions = await this.hrClient.createFunctions(company.company_id, data.functions);
      compensations.push(() => this.hrClient.deleteFunctions(functions.map(f => f.id)));

      // Step 3: Create Jobs
      const jobs = await this.hrClient.createJobs(company.company_id, data.jobs);
      compensations.push(() => this.hrClient.deleteJobs(jobs.map(j => j.id)));

      // Step 4: Create Processes
      const processes = await this.processClient.createProcesses(company.company_id, data.processes);
      compensations.push(() => this.processClient.deleteProcesses(processes.map(p => p.id)));

      // Step 5: Create People
      const people = await this.hrClient.createPeople(company.company_id, data.people);

      return { success: true, sagaId, companyId: company.company_id };
    } catch (error) {
      // Compensate in reverse order
      for (const compensation of compensations.reverse()) {
        await compensation().catch(err => console.error('Compensation failed:', err));
      }
      throw error;
    }
  }
}
```

---

## 9. Service Communication Matrix

| From ↓ / To → | Auth | Org | HR | Process | Infra | Skills | Integration |
|---------------|------|-----|----|---------| ------|--------|-------------|
| **Auth** | - | Event | Event | Event | Event | Event | - |
| **Org** | REST | - | Event | Event | Event | - | - |
| **HR** | REST | REST/gRPC | - | REST | REST | REST/gRPC | - |
| **Process** | REST | REST/gRPC | REST/gRPC | - | - | REST/gRPC | - |
| **Infra** | REST | REST/gRPC | Event | - | - | - | - |
| **Skills** | REST | - | Event | Event | - | - | - |
| **Integration** | REST | REST | REST | REST | REST | REST | - |

**Legend**:
- **REST**: Synchronous HTTP calls
- **gRPC**: High-performance RPC
- **Event**: Asynchronous message-based

---

## 10. Circuit Breaker & Resilience

### Circuit Breaker Pattern
Prevent cascade failures when services are down:

```typescript
// resilience.decorator.ts
export function CircuitBreaker(options: { threshold: number; timeout: number }) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    let failureCount = 0;
    let isOpen = false;
    let lastFailureTime = 0;

    descriptor.value = async function (...args: any[]) {
      if (isOpen && Date.now() - lastFailureTime < options.timeout) {
        throw new Error('Circuit breaker is OPEN');
      }

      try {
        const result = await originalMethod.apply(this, args);
        failureCount = 0;
        isOpen = false;
        return result;
      } catch (error) {
        failureCount++;
        if (failureCount >= options.threshold) {
          isOpen = true;
          lastFailureTime = Date.now();
        }
        throw error;
      }
    };
  };
}

// Usage
@Injectable()
export class HrService {
  @CircuitBreaker({ threshold: 5, timeout: 60000 })
  async validateCompany(companyId: number): Promise<boolean> {
    return await this.organizationClient.validateCompany(companyId);
  }
}
```

---

**Next Document**: `04_DATABASE_PER_SERVICE_STRATEGY.md`
