# Incremental Migration Roadmap

## Executive Summary
This document outlines a phased, low-risk migration strategy from the current monolithic architecture to microservices, with emphasis on maintaining system stability and zero downtime.

---

## Migration Principles

### Core Tenets
1. **Incremental Extraction**: Extract one service at a time
2. **Dual-Run Pattern**: Run old and new systems in parallel during transition
3. **Feature Flags**: Control traffic routing between monolith and microservices
4. **Rollback Ready**: Ability to revert at any phase
5. **Zero Downtime**: No service interruption for end users
6. **Data Consistency**: Maintain data integrity throughout migration

### Risk Mitigation Strategies
- **Canary Deployments**: Route small percentage of traffic to new services initially
- **Comprehensive Testing**: E2E tests, integration tests, load tests
- **Monitoring**: Real-time metrics and alerts during migration
- **Database Replication**: Sync data between monolith and new service databases
- **Gradual Rollout**: Progressive traffic shift over days/weeks

---

## Phase 0: Preparation & Foundation (Weeks 1-4)

### Objectives
- Set up infrastructure foundation
- Establish development/deployment workflows
- Create shared libraries and contracts
- Implement monitoring and observability

### Tasks

#### Week 1-2: Infrastructure Setup
- [ ] Set up Docker registry (GHCR or private registry)
- [ ] Configure RabbitMQ cluster
- [ ] Deploy Redis for caching
- [ ] Set up Kubernetes cluster (or use managed service)
- [ ] Configure monitoring stack (Prometheus, Grafana)
- [ ] Set up ELK stack for centralized logging
- [ ] Create CI/CD pipelines template

#### Week 3-4: Code Preparation
- [ ] Extract shared types to `@digital-twin/common` package
- [ ] Create DTOs for inter-service communication
- [ ] Define event schemas
- [ ] Create gRPC protocol definitions
- [ ] Implement feature flag system
- [ ] Add correlation ID tracking to existing monolith
- [ ] Enhance logging with structured format

### Deliverables
- ✅ Infrastructure operational and monitored
- ✅ Shared libraries published to npm registry
- ✅ Event schemas documented
- ✅ CI/CD pipeline functional

### Risk Assessment
**Risk Level**: Low
- No production changes
- Infrastructure can be tested independently

---

## Phase 1: Extract Organization Service (Weeks 5-8)

### Objectives
- Extract the simplest, most isolated service first
- Validate migration approach
- Establish patterns for subsequent phases

### Why Organization Service First?
- **Simple domain**: Only 2 tables (company, OrganizationType)
- **Few dependencies**: Only depends on Auth Service for user validation
- **Low coupling**: Other services depend on it, but it doesn't depend on them
- **High read, low write**: Good for testing caching strategies

### Tasks

#### Week 5: Service Development
- [ ] Create `organization-service` project structure
- [ ] Set up separate Prisma schema with `company` and `OrganizationType`
- [ ] Implement CRUD operations
- [ ] Add gRPC endpoints for internal communication
- [ ] Implement REST API for external access
- [ ] Add health check endpoint
- [ ] Write unit and integration tests

#### Week 6: Database Migration
- [ ] Create `organization_db` database
- [ ] Copy `company` and `OrganizationType` data from monolith
- [ ] Set up bi-directional sync (Change Data Capture)
- [ ] Verify data consistency

#### Week 7: Integration & Testing
- [ ] Deploy to staging environment
- [ ] Integrate with existing monolith (dual-write pattern)
- [ ] Add feature flag for routing: `USE_ORGANIZATION_SERVICE`
- [ ] Load testing
- [ ] Security testing
- [ ] Performance benchmarking vs monolith

#### Week 8: Production Rollout
- [ ] Deploy to production (0% traffic)
- [ ] Enable 10% traffic via feature flag
- [ ] Monitor for 48 hours
- [ ] Increase to 50% traffic
- [ ] Monitor for 48 hours
- [ ] Route 100% traffic to new service
- [ ] Remove organization module from monolith (after 1 week stability)

### Implementation Pattern: Dual-Write

```typescript
// In monolith: company.service.ts
@Injectable()
export class CompanyService {
  constructor(
    private prisma: PrismaService,
    @Inject('ORGANIZATION_SERVICE') private orgClient: ClientProxy,
    private featureFlags: FeatureFlagService
  ) {}

  async create(dto: CreateCompanyDto) {
    const useNewService = await this.featureFlags.isEnabled('USE_ORGANIZATION_SERVICE');

    if (useNewService) {
      // Route to new microservice
      return firstValueFrom(this.orgClient.send('create_company', dto));
    } else {
      // Use existing monolith logic
      return this.prisma.company.create({ data: dto });
    }
  }

  // Read operations can use feature flag for gradual rollout
  async findAll() {
    const rolloutPercentage = await this.featureFlags.getValue('ORG_SERVICE_ROLLOUT', 0);
    const random = Math.random() * 100;

    if (random < rolloutPercentage) {
      return firstValueFrom(this.orgClient.send('list_companies', {}));
    } else {
      return this.prisma.company.findMany();
    }
  }
}
```

### Deliverables
- ✅ Organization Service running in production
- ✅ 100% traffic routed to new service
- ✅ Monolith organization module deprecated

### Risk Assessment
**Risk Level**: Low-Medium
**Risks**:
- Data sync issues between monolith and service
- Performance degradation due to network calls

**Mitigation**:
- Comprehensive monitoring of both systems
- Automated data consistency checks
- Rollback plan: Disable feature flag to route back to monolith

---

## Phase 2: Extract Auth Service (Weeks 9-12)

### Objectives
- Centralize authentication and authorization
- Enable independent scaling of auth operations
- Prepare for future OAuth/SSO integration

### Why Auth Service Second?
- **Critical service**: Authentication required by all services
- **Self-contained**: Only 2 tables, minimal dependencies
- **High traffic**: Benefits from independent scaling

### Tasks

#### Week 9-10: Service Development
- [ ] Create `auth-service` project
- [ ] Migrate `user` and `role` tables
- [ ] Implement JWT token generation/validation
- [ ] Implement password hashing with bcrypt
- [ ] Add refresh token mechanism
- [ ] Create gRPC endpoints for token validation
- [ ] Add rate limiting for login attempts
- [ ] Implement account lockout after failed attempts

#### Week 10-11: Integration
- [ ] Update API Gateway to use Auth Service for JWT validation
- [ ] Update all services to validate tokens via Auth Service
- [ ] Implement service-to-service authentication (mTLS or API keys)
- [ ] Database sync with monolith
- [ ] Testing in staging

#### Week 12: Production Rollout
- [ ] Deploy with 0% traffic
- [ ] Gradual rollout: 10% → 25% → 50% → 100%
- [ ] Monitor authentication success rates
- [ ] Monitor token validation latency
- [ ] Remove auth module from monolith

### Special Consideration: Session Migration
```typescript
// During migration, validate tokens issued by both systems
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  async validate(payload: any) {
    const isLegacyToken = payload.iss === 'monolith';
    
    if (isLegacyToken) {
      // Legacy token from monolith - still valid
      return { ...payload, migrated: false };
    } else {
      // New token from Auth Service
      return { ...payload, migrated: true };
    }
  }
}
```

### Deliverables
- ✅ Auth Service operational
- ✅ All authentication routed through Auth Service
- ✅ Legacy auth system deprecated

### Risk Assessment
**Risk Level**: Medium
**Risks**:
- Authentication failures impact all services
- Session invalidation during migration

**Mitigation**:
- Keep monolith auth as fallback for 2 weeks
- Gradual token migration (both systems accept tokens from each other)
- Automated smoke tests every 5 minutes

---

## Phase 3: Extract Skills Service (Weeks 13-15)

### Objectives
- Create centralized skills catalog
- Enable skills service to be consumed by HR and Process services

### Why Skills Service Third?
- **Reference data**: Mostly read operations
- **Independent**: No complex dependencies
- **Preparation**: Required before HR/Process extraction

### Tasks

#### Week 13-14: Development & Migration
- [ ] Create `skills-service`
- [ ] Migrate `skill` and `skill_level` tables
- [ ] Implement CRUD + search functionality
- [ ] Add caching layer (Redis)
- [ ] Implement event publishing for skill changes
- [ ] Database sync and testing

#### Week 15: Production Rollout
- [ ] Deploy and gradual rollout
- [ ] Monitor cache hit rates
- [ ] Remove skills module from monolith

### Deliverables
- ✅ Skills Service operational
- ✅ Cache strategy validated

### Risk Assessment
**Risk Level**: Low
- Simple domain, low write frequency

---

## Phase 4: Extract HR Service (Weeks 16-22)

### Objectives
- Extract complex HR domain (people, jobs, functions)
- Handle many-to-many relationships
- Implement cross-service references

### Why HR Service Fourth?
- **Complex domain**: 6 tables with relationships
- **High traffic**: Benefits from independent scaling
- **Depends on**: Organization, Skills services (already extracted)

### Tasks

#### Week 16-18: Service Development
- [ ] Create `hr-service` project
- [ ] Migrate tables: `people`, `job`, `job_level`, `Function`, `job_skill`, `table_job`
- [ ] Implement CRUD operations
- [ ] Handle hierarchical Function structure
- [ ] Implement cross-service validation (Organization, Skills)
- [ ] Add event listeners for Organization/Skills changes
- [ ] Comprehensive testing

#### Week 19-20: Database & Data Migration
- [ ] Create `hr_db` database
- [ ] Data migration scripts
- [ ] Handle foreign key removal (company_id, skill_id references)
- [ ] Implement reference data caching
- [ ] Data consistency verification

#### Week 20-21: Integration Testing
- [ ] Integration with Organization Service
- [ ] Integration with Skills Service
- [ ] Integration with Infrastructure Service (for table assignments)
- [ ] Load testing (people queries are high-frequency)
- [ ] Event-driven cascade testing (company deleted → people deleted)

#### Week 22: Production Rollout
- [ ] Canary deployment: 5% → 25% → 50% → 100%
- [ ] Monitor query performance
- [ ] Monitor event processing
- [ ] Deprecate HR modules in monolith

### Critical Migration: Handling job_skill References

```typescript
// Before: Direct FK in monolith
job_skill.skill_id → skill.skill_id

// After: Service-level validation
@Injectable()
export class JobService {
  async addSkillToJob(jobId: number, skillId: number, levelId: number) {
    // 1. Validate skill exists via Skills Service
    const skillExists = await firstValueFrom(
      this.skillsClient.send('validate_skill', { skillId })
    );
    if (!skillExists) throw new NotFoundException('Skill not found');

    // 2. Create association
    await this.prisma.job_skill.create({
      data: { job_id: jobId, skill_id: skillId, skill_level_id: levelId }
    });

    // 3. Fetch skill details for denormalization
    const skill = await firstValueFrom(
      this.skillsClient.send('get_skill', { skillId })
    );

    // 4. Store denormalized skill name for performance
    await this.prisma.job_skill.update({
      where: { job_id_skill_id: { job_id: jobId, skill_id: skillId } },
      data: { skill_name: skill.name }
    });
  }
}
```

### Deliverables
- ✅ HR Service operational
- ✅ Cross-service validation working
- ✅ Event-driven synchronization verified

### Risk Assessment
**Risk Level**: Medium-High
**Risks**:
- Complex domain with many relationships
- Cross-service validation latency
- Data consistency across 3 services

**Mitigation**:
- Extensive integration testing
- Cache validation results
- Implement circuit breakers
- Dual-run for 2 weeks minimum

---

## Phase 5: Extract Process Service (Weeks 23-28)

### Objectives
- Extract business process and workflow management
- Handle complex process-task-job relationships

### Tasks

#### Week 23-25: Development
- [ ] Create `process-service`
- [ ] Migrate: `process`, `task`, `process_task`, `task_skill`, `job_task`
- [ ] Implement workflow orchestration
- [ ] Capacity calculation logic
- [ ] Event-driven job validation

#### Week 26-27: Integration & Testing
- [ ] Integration with HR Service (job validations)
- [ ] Integration with Skills Service
- [ ] Workflow execution testing
- [ ] Load testing

#### Week 28: Production Rollout
- [ ] Gradual rollout
- [ ] Monitor workflow execution times
- [ ] Deprecate process/task modules

### Deliverables
- ✅ Process Service operational
- ✅ Complex workflows functioning correctly

### Risk Assessment
**Risk Level**: Medium
- Complex business logic
- Multiple service dependencies

---

## Phase 6: Extract Infrastructure Service (Weeks 29-33)

### Objectives
- Extract physical infrastructure management
- Prepare for Unity 3D integration

### Tasks

#### Week 29-31: Development
- [ ] Create `infrastructure-service`
- [ ] Migrate: `building`, `building_cell`, `floor`, `room`, `table`
- [ ] Implement grid-based layout logic
- [ ] Cascade delete handling
- [ ] 3D coordinate calculations

#### Week 32-33: Rollout
- [ ] Integration testing with HR Service (table assignments)
- [ ] Unity client integration testing
- [ ] Production deployment

### Deliverables
- ✅ Infrastructure Service operational
- ✅ Unity integration functional

### Risk Assessment
**Risk Level**: Low-Medium

---

## Phase 7: Extract Integration Service & API Gateway (Weeks 34-38)

### Objectives
- Centralize import/export operations
- Deploy unified API Gateway
- Complete monolith retirement

### Tasks

#### Week 34-36: Integration Service
- [ ] Create orchestration service for bulk operations
- [ ] Implement Saga pattern for distributed transactions
- [ ] File upload/processing (XLSX imports)
- [ ] Cross-service data export

#### Week 37-38: API Gateway
- [ ] Deploy API Gateway to production
- [ ] Route all client traffic through gateway
- [ ] Implement aggregation endpoints
- [ ] Deprecate monolith API

### Deliverables
- ✅ All client traffic through API Gateway
- ✅ Monolith fully retired

---

## Phase 8: Monolith Decommission (Weeks 39-40)

### Tasks
- [ ] Final data verification across all services
- [ ] Remove monolith from production
- [ ] Archive monolith codebase
- [ ] Update documentation
- [ ] Team training on new architecture

### Celebration Criteria
- ✅ Monolith shutdown without incident
- ✅ All services running independently
- ✅ No increase in error rates
- ✅ Improved deployment frequency
- ✅ Independent service scaling verified

---

## Rollback Procedures

### Per-Phase Rollback
Each phase must have documented rollback procedure:

```typescript
// Feature flag based rollback
async rollbackToMonolith(serviceName: string) {
  // 1. Disable feature flag
  await this.featureFlags.disable(`USE_${serviceName.toUpperCase()}_SERVICE`);
  
  // 2. Verify traffic routing back to monolith
  await this.verifyMonolithTraffic(serviceName);
  
  // 3. Alert team
  await this.alerting.notify(`Rolled back ${serviceName} to monolith`);
  
  // 4. Keep microservice running for data sync
  // 5. Investigate issues before retry
}
```

### Emergency Rollback
- **Decision Time**: < 5 minutes
- **Execution Time**: < 2 minutes (via feature flag)
- **Automated**: Trigger on error rate > 5% or latency > 2x baseline

---

## Success Metrics

### Technical Metrics
- **Deployment Frequency**: Target 10x improvement
- **Lead Time**: Reduced from weeks to days
- **MTTR**: Reduced by 50%
- **Service Uptime**: 99.9% SLA per service

### Business Metrics
- **API Response Time**: < 200ms p95
- **Concurrent Users**: Support 10x growth
- **Feature Velocity**: 3x faster feature delivery

---

## Timeline Summary

| Phase | Duration | Services Extracted | Cumulative Progress |
|-------|----------|-------------------|---------------------|
| 0 - Preparation | 4 weeks | - | 0% |
| 1 - Organization | 4 weeks | Organization | 14% |
| 2 - Auth | 4 weeks | Auth | 29% |
| 3 - Skills | 3 weeks | Skills | 43% |
| 4 - HR | 7 weeks | HR | 57% |
| 5 - Process | 6 weeks | Process | 71% |
| 6 - Infrastructure | 5 weeks | Infrastructure | 86% |
| 7 - Integration/Gateway | 5 weeks | Integration, Gateway | 100% |
| 8 - Decommission | 2 weeks | - | Complete |
| **Total** | **40 weeks (10 months)** | **7 services + Gateway** | **100%** |

---

**Next Document**: `08_SCALABILITY_FUTURE_CONSIDERATIONS.md`
