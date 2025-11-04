# Quick Start Guide - Phase 0 Implementation

## 🚀 Getting Started with Microservices Migration

This guide provides **actionable steps** to begin the migration immediately after stakeholder approval.

---

## Week 1: Infrastructure Foundation

### Day 1: Development Environment Setup

#### 1. Install Required Tools

```bash
# Install Docker Desktop (if not already installed)
# Download from: https://www.docker.com/products/docker-desktop/

# Verify installation
docker --version
docker-compose --version

# Install kubectl (Kubernetes CLI)
# Windows (using Chocolatey):
choco install kubernetes-cli

# Verify
kubectl version --client

# Install Helm (Kubernetes package manager)
choco install kubernetes-helm
helm version
```

#### 2. Set Up Local Kubernetes Cluster

**Option A: Docker Desktop (Recommended for Windows)**
```bash
# Enable Kubernetes in Docker Desktop settings
# Settings → Kubernetes → Enable Kubernetes

# Verify cluster is running
kubectl cluster-info
kubectl get nodes
```

**Option B: Minikube**
```bash
choco install minikube
minikube start --driver=docker
kubectl config use-context minikube
```

#### 3. Create Project Directory Structure

```bash
# Navigate to your workspace
cd "d:\Crystal System\initial prototype\digital-twin-enterprise\backend"

# Create microservices directory structure
mkdir microservices
cd microservices

# Create service directories
mkdir api-gateway
mkdir services
cd services
mkdir auth-service
mkdir organization-service
mkdir hr-service
mkdir process-service
mkdir infrastructure-service
mkdir skills-service
mkdir integration-service

# Create shared directory for common code
cd ..
mkdir shared
cd shared
mkdir common
mkdir proto
mkdir events

# Create Kubernetes manifests directory
cd ..
mkdir kubernetes
cd kubernetes
mkdir base
mkdir overlays
cd overlays
mkdir development
mkdir staging
mkdir production
```

### Day 2: Message Broker & Cache Setup

#### Install RabbitMQ (Docker)

```bash
# Create docker-compose-infra.yml
cd "d:\Crystal System\initial prototype\digital-twin-enterprise\backend\microservices"
```

Create `docker-compose-infra.yml`:

```yaml
version: '3.8'

services:
  rabbitmq:
    image: rabbitmq:3.12-management-alpine
    container_name: digital-twin-rabbitmq
    ports:
      - "5672:5672"   # AMQP port
      - "15672:15672" # Management UI
    environment:
      RABBITMQ_DEFAULT_USER: admin
      RABBITMQ_DEFAULT_PASS: admin123
    volumes:
      - rabbitmq-data:/var/lib/rabbitmq
    networks:
      - microservices

  redis:
    image: redis:7-alpine
    container_name: digital-twin-redis
    ports:
      - "6379:6379"
    command: redis-server --appendonly yes
    volumes:
      - redis-data:/data
    networks:
      - microservices

  prometheus:
    image: prom/prometheus:latest
    container_name: digital-twin-prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus-data:/prometheus
    networks:
      - microservices

  grafana:
    image: grafana/grafana:latest
    container_name: digital-twin-grafana
    ports:
      - "3100:3000"
    environment:
      - GF_SECURITY_ADMIN_USER=admin
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana-data:/var/lib/grafana
    networks:
      - microservices

volumes:
  rabbitmq-data:
  redis-data:
  prometheus-data:
  grafana-data:

networks:
  microservices:
    driver: bridge
```

Start infrastructure:

```bash
docker-compose -f docker-compose-infra.yml up -d

# Verify services are running
docker-compose -f docker-compose-infra.yml ps

# Access RabbitMQ Management UI: http://localhost:15672 (admin/admin123)
# Access Grafana: http://localhost:3100 (admin/admin)
# Access Prometheus: http://localhost:9090
```

### Day 3: Create Shared Libraries

#### 1. Create Common Package

```bash
cd "d:\Crystal System\initial prototype\digital-twin-enterprise\backend\microservices\shared\common"
npm init -y
```

Create `package.json`:

```json
{
  "name": "@digital-twin/common",
  "version": "1.0.0",
  "description": "Shared types and utilities for Digital Twin microservices",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "watch": "tsc --watch"
  },
  "dependencies": {
    "class-validator": "^0.14.2",
    "class-transformer": "^0.5.1"
  },
  "devDependencies": {
    "typescript": "^5.7.3",
    "@types/node": "^22.10.7"
  }
}
```

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2021",
    "module": "commonjs",
    "declaration": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

Create `src/index.ts`:

```typescript
// Event Base
export interface DomainEvent {
  eventId: string;
  eventType: string;
  timestamp: string;
  version: string;
  source: string;
  correlationId?: string;
  payload: any;
  metadata?: Record<string, any>;
}

// Common DTOs
export class PaginationDto {
  page?: number = 1;
  limit?: number = 10;
}

export class PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Common Response Types
export class ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: string;
}

// Event Types
export enum EventType {
  // Organization events
  COMPANY_CREATED = 'organization.company.created',
  COMPANY_UPDATED = 'organization.company.updated',
  COMPANY_DELETED = 'organization.company.deleted',
  
  // HR events
  PERSON_CREATED = 'hr.person.created',
  PERSON_UPDATED = 'hr.person.updated',
  PERSON_DELETED = 'hr.person.deleted',
  JOB_CREATED = 'hr.job.created',
  JOB_SKILLS_UPDATED = 'hr.job.skillsUpdated',
  
  // Process events
  PROCESS_CREATED = 'process.process.created',
  TASK_CREATED = 'process.task.created',
  WORKFLOW_COMPLETED = 'process.workflow.completed',
  
  // Auth events
  USER_CREATED = 'auth.user.created',
  USER_ROLE_CHANGED = 'auth.user.roleChanged',
  
  // Skills events
  SKILL_CREATED = 'skills.skill.created',
  SKILL_UPDATED = 'skills.skill.updated',
}

// Utility functions
export function createDomainEvent(
  eventType: EventType,
  source: string,
  payload: any,
  correlationId?: string
): DomainEvent {
  return {
    eventId: generateUUID(),
    eventType,
    timestamp: new Date().toISOString(),
    version: '1.0',
    source,
    correlationId,
    payload,
  };
}

export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
```

Build the package:

```bash
npm install
npm run build

# Link for local development
npm link
```

### Day 4-5: Set Up Monitoring Stack

#### Create Prometheus Configuration

Create `monitoring/prometheus.yml`:

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  - job_name: 'api-gateway'
    static_configs:
      - targets: ['api-gateway:3000']
    metrics_path: '/metrics'

  - job_name: 'auth-service'
    static_configs:
      - targets: ['auth-service:3000']

  - job_name: 'organization-service'
    static_configs:
      - targets: ['organization-service:3000']

  - job_name: 'hr-service'
    static_configs:
      - targets: ['hr-service:3000']
```

---

## Week 2: First Service Extraction (Organization Service)

### Create Organization Service Project

```bash
cd "d:\Crystal System\initial prototype\digital-twin-enterprise\backend\microservices\services\organization-service"

# Initialize NestJS project
npx @nestjs/cli new . --skip-git --package-manager npm

# Install dependencies
npm install @prisma/client prisma
npm install @nestjs/microservices
npm install class-validator class-transformer
npm install amqplib amqp-connection-manager
npm install --save-dev @types/amqplib

# Link shared common package
npm link @digital-twin/common
```

### Set Up Prisma

Create `prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}

model company {
  company_id          Int                @id @default(autoincrement())
  companyCode         String             @unique
  name                String
  created_by          Int                // Reference only, no FK
  created_at          DateTime           @default(now())
  updated_at          DateTime           @updatedAt
  organizationTypeId  Int?               @map("org_type_id")
  organizationType    OrganizationType?  @relation(fields: [organizationTypeId], references: [id])

  @@index([organizationTypeId])
}

model OrganizationType {
  id          Int       @id @default(autoincrement())
  name        String    @unique
  description String?
  companies   company[]
}
```

Create `.env`:

```env
DATABASE_URL="mysql://root:password@localhost:3307/organization_db"
PORT=3002
RABBITMQ_URL="amqp://admin:admin123@localhost:5672"
JWT_SECRET="your-jwt-secret-here"
```

Initialize database:

```bash
# Create database (run in MySQL)
# CREATE DATABASE organization_db;

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma db push
```

### Create Basic Service Structure

Create `src/organization/organization.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { OrganizationService } from './organization.service';
import { OrganizationController } from './organization.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { EventModule } from '../events/event.module';

@Module({
  imports: [PrismaModule, EventModule],
  controllers: [OrganizationController],
  providers: [OrganizationService],
  exports: [OrganizationService],
})
export class OrganizationModule {}
```

### Health Check Endpoint

Create `src/health/health.controller.ts`:

```typescript
import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  check() {
    return {
      status: 'ok',
      service: 'organization-service',
      timestamp: new Date().toISOString(),
    };
  }
}
```

### Run the Service

```bash
npm run start:dev

# Test health endpoint
curl http://localhost:3002/health
```

---

## Week 3: Feature Flags Implementation

### Add Feature Flag Service to Monolith

Create `src/feature-flags/feature-flags.service.ts` in your monolith:

```typescript
import { Injectable } from '@nestjs/common';

interface FeatureFlag {
  name: string;
  enabled: boolean;
  rolloutPercentage: number;
}

@Injectable()
export class FeatureFlagsService {
  private flags: Map<string, FeatureFlag> = new Map();

  constructor() {
    // Initialize feature flags
    this.flags.set('USE_ORGANIZATION_SERVICE', {
      name: 'USE_ORGANIZATION_SERVICE',
      enabled: false,
      rolloutPercentage: 0,
    });
  }

  async isEnabled(flagName: string): Promise<boolean> {
    const flag = this.flags.get(flagName);
    return flag?.enabled ?? false;
  }

  async getValue(flagName: string, defaultValue: number): Promise<number> {
    const flag = this.flags.get(flagName);
    return flag?.rolloutPercentage ?? defaultValue;
  }

  async setFlag(flagName: string, enabled: boolean, rolloutPercentage: number = 100) {
    this.flags.set(flagName, { name: flagName, enabled, rolloutPercentage });
  }
}
```

### Dual-Write Pattern in Monolith

Update your existing `company.service.ts`:

```typescript
import { Injectable, Inject } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ClientProxy } from '@nestjs/microservices';
import { FeatureFlagsService } from '../feature-flags/feature-flags.service';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class CompanyService {
  constructor(
    private prisma: PrismaService,
    @Inject('ORGANIZATION_SERVICE') private orgClient: ClientProxy,
    private featureFlags: FeatureFlagsService,
  ) {}

  async create(dto: any) {
    const useNewService = await this.featureFlags.isEnabled('USE_ORGANIZATION_SERVICE');

    if (useNewService) {
      // Route to new microservice
      return firstValueFrom(this.orgClient.send('create_company', dto));
    } else {
      // Use existing monolith logic
      return this.prisma.company.create({ data: dto });
    }
  }

  async findAll() {
    const rolloutPercentage = await this.featureFlags.getValue('ORG_SERVICE_ROLLOUT', 0);
    const shouldUseNewService = Math.random() * 100 < rolloutPercentage;

    if (shouldUseNewService) {
      return firstValueFrom(this.orgClient.send('list_companies', {}));
    } else {
      return this.prisma.company.findMany();
    }
  }
}
```

---

## Week 4: CI/CD Pipeline Setup

### Create GitHub Actions Workflow

Create `.github/workflows/organization-service.yml`:

```yaml
name: Organization Service CI/CD

on:
  push:
    branches: [ main, develop ]
    paths:
      - 'microservices/services/organization-service/**'
  pull_request:
    branches: [ main ]
    paths:
      - 'microservices/services/organization-service/**'

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}/organization-service

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
        cache-dependency-path: microservices/services/organization-service/package-lock.json
    
    - name: Install dependencies
      working-directory: microservices/services/organization-service
      run: npm ci
    
    - name: Run tests
      working-directory: microservices/services/organization-service
      run: npm test

  build-and-push:
    needs: test
    runs-on: ubuntu-latest
    if: github.event_name != 'pull_request'
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Log in to Container Registry
      uses: docker/login-action@v2
      with:
        registry: ${{ env.REGISTRY }}
        username: ${{ github.actor }}
        password: ${{ secrets.GITHUB_TOKEN }}
    
    - name: Build and push Docker image
      uses: docker/build-push-action@v4
      with:
        context: microservices/services/organization-service
        push: true
        tags: |
          ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }}
          ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:latest
```

---

## Checklist: Phase 0 Completion

Use this checklist to track your progress:

### Infrastructure
- [ ] Docker Desktop installed and running
- [ ] Kubernetes cluster operational (Docker Desktop or Minikube)
- [ ] kubectl configured and working
- [ ] RabbitMQ running (accessible at localhost:15672)
- [ ] Redis running (accessible at localhost:6379)
- [ ] Prometheus running (accessible at localhost:9090)
- [ ] Grafana running (accessible at localhost:3100)

### Development Environment
- [ ] Microservices directory structure created
- [ ] Shared common package created and built
- [ ] Common package linked for local development
- [ ] Event schemas defined
- [ ] gRPC proto files created (if using gRPC)

### First Service (Organization)
- [ ] Organization service project created
- [ ] Prisma schema defined
- [ ] Database created (organization_db)
- [ ] Health check endpoint working
- [ ] Basic CRUD operations implemented
- [ ] Event publishing configured
- [ ] Service starts without errors

### Monolith Integration
- [ ] Feature flags service added to monolith
- [ ] Dual-write pattern implemented
- [ ] Microservice client configured in monolith
- [ ] Feature flags tested (can toggle between old/new)

### CI/CD
- [ ] GitHub Actions workflow created
- [ ] Test pipeline working
- [ ] Docker image builds successfully
- [ ] Image pushed to registry

### Documentation
- [ ] Team trained on new architecture
- [ ] Runbooks created for common operations
- [ ] Monitoring dashboards configured
- [ ] Incident response procedures documented

---

## Common Commands Reference

### Docker
```bash
# Start all infrastructure
docker-compose -f docker-compose-infra.yml up -d

# Stop all infrastructure
docker-compose -f docker-compose-infra.yml down

# View logs
docker-compose -f docker-compose-infra.yml logs -f rabbitmq

# Restart a service
docker-compose -f docker-compose-infra.yml restart redis
```

### Kubernetes
```bash
# Apply configuration
kubectl apply -f kubernetes/base/

# Get all pods
kubectl get pods -n digital-twin-prod

# View logs
kubectl logs -f <pod-name> -n digital-twin-prod

# Port forward for local access
kubectl port-forward svc/api-gateway 3000:3000 -n digital-twin-prod

# Scale deployment
kubectl scale deployment hr-service --replicas=5 -n digital-twin-prod
```

### Service Development
```bash
# Start service in development mode
npm run start:dev

# Build service
npm run build

# Run tests
npm test

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma db push
```

---

## Next Steps

After completing Phase 0:

1. **Week 5-8**: Begin Phase 1 - Organization Service extraction
2. **Set up monitoring**: Configure Grafana dashboards for service metrics
3. **Load testing**: Baseline current monolith performance
4. **Team sync**: Daily standups to track progress
5. **Documentation**: Keep migration journal of learnings

---

## Troubleshooting

### RabbitMQ Connection Issues
```bash
# Check if RabbitMQ is running
docker ps | grep rabbitmq

# Restart RabbitMQ
docker-compose -f docker-compose-infra.yml restart rabbitmq

# Check logs
docker logs digital-twin-rabbitmq
```

### Database Connection Issues
```bash
# Test MySQL connection
mysql -h localhost -P 3307 -u root -p

# Check Prisma connection
npx prisma db pull
```

### Port Already in Use
```bash
# Windows: Find process using port
netstat -ano | findstr :3002

# Kill process
taskkill /PID <process-id> /F
```

---

## Support Resources

- **Architecture Docs**: `backend/docs/`
- **Team Chat**: [Your team communication channel]
- **Issue Tracker**: [Your project management tool]
- **On-Call**: [Emergency contact information]

---

**You're now ready to begin the microservices migration!** 🚀

Start with infrastructure setup and proceed step-by-step through the checklist. Good luck!
