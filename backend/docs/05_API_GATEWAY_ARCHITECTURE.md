# API Gateway Architecture

## Executive Summary
This document defines the API Gateway layer that serves as the single entry point for all client applications (CMS, Unity, Mobile), providing routing, authentication, request aggregation, and cross-cutting concerns.

---

## 1. API Gateway Overview

### Purpose
- **Single Entry Point**: Unified interface for all microservices
- **Request Routing**: Intelligent routing to appropriate backend services
- **Authentication**: Centralized JWT validation
- **Response Aggregation**: Combine data from multiple services
- **Protocol Translation**: REST → gRPC conversion for internal calls
- **Cross-Cutting Concerns**: Rate limiting, logging, caching, CORS

### Technology Stack Options

| Option | Pros | Cons | Recommendation |
|--------|------|------|----------------|
| **NestJS Gateway** | TypeScript, same stack, easy integration | Less mature than dedicated gateways | ✅ **Recommended** (consistency) |
| **Kong** | Feature-rich, battle-tested, plugin ecosystem | Learning curve, separate deployment | Alternative |
| **AWS API Gateway** | Managed, scalable, integrated with AWS | Vendor lock-in, cost | Cloud-first scenarios |
| **Nginx + Lua** | High performance, flexible | Complex configuration | Not recommended |

**Decision**: Use **NestJS-based API Gateway** for technology consistency and TypeScript benefits.

---

## 2. Gateway Service Architecture

### Project Structure
```
api-gateway/
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   ├── auth/
│   │   ├── jwt-auth.guard.ts
│   │   ├── roles.guard.ts
│   │   └── auth.strategy.ts
│   ├── routes/
│   │   ├── company.controller.ts      # Route to Organization Service
│   │   ├── people.controller.ts       # Route to HR Service
│   │   ├── process.controller.ts      # Route to Process Service
│   │   ├── infrastructure.controller.ts
│   │   └── aggregation.controller.ts  # Multi-service aggregation
│   ├── clients/
│   │   ├── organization.client.ts
│   │   ├── hr.client.ts
│   │   ├── process.client.ts
│   │   └── infrastructure.client.ts
│   ├── middleware/
│   │   ├── rate-limit.middleware.ts
│   │   ├── logging.middleware.ts
│   │   └── correlation-id.middleware.ts
│   ├── interceptors/
│   │   ├── cache.interceptor.ts
│   │   ├── timeout.interceptor.ts
│   │   └── transform.interceptor.ts
│   └── filters/
│       └── http-exception.filter.ts
├── Dockerfile
├── package.json
└── tsconfig.json
```

---

## 3. Routing Strategy

### Route Mapping

| Client Request | Gateway Route | Target Service | Method |
|----------------|---------------|----------------|--------|
| `POST /auth/login` | Direct pass-through | Auth Service | REST |
| `GET /companies` | `/v1/companies` | Organization Service | REST |
| `GET /people?company_id=X` | `/v1/people` | HR Service | REST |
| `GET /processes/:id` | `/v1/processes/:id` | Process Service | gRPC |
| `GET /buildings/:id` | `/v1/buildings/:id` | Infrastructure Service | REST |
| `GET /skills` | `/v1/skills` | Skills Service | REST |
| `GET /companies/:id/full` | Aggregation endpoint | Multiple services | REST+gRPC |

### Routing Configuration
```typescript
// app.module.ts
@Module({
  imports: [
    // Service clients
    ClientsModule.register([
      {
        name: 'AUTH_SERVICE',
        transport: Transport.TCP,
        options: { host: 'auth-service', port: 3001 }
      },
      {
        name: 'ORGANIZATION_SERVICE',
        transport: Transport.GRPC,
        options: {
          package: 'organization',
          protoPath: join(__dirname, '../proto/organization.proto'),
          url: 'organization-service:5000'
        }
      },
      {
        name: 'HR_SERVICE',
        transport: Transport.TCP,
        options: { host: 'hr-service', port: 3003 }
      },
      {
        name: 'PROCESS_SERVICE',
        transport: Transport.GRPC,
        options: {
          package: 'process',
          protoPath: join(__dirname, '../proto/process.proto'),
          url: 'process-service:5001'
        }
      }
    ])
  ],
  controllers: [
    CompanyController,
    PeopleController,
    ProcessController,
    AggregationController
  ],
  providers: [RateLimitService, CacheService]
})
export class AppModule {}
```

---

## 4. Authentication & Authorization

### JWT Validation Flow
```
Client → API Gateway → Validate JWT → Check Roles → Route to Service
```

### Implementation
```typescript
// jwt-auth.guard.ts
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any) {
    if (err || !user) {
      throw new UnauthorizedException('Invalid or expired token');
    }
    return user;
  }
}

// jwt.strategy.ts
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET
    });
  }

  async validate(payload: any) {
    return {
      userId: payload.sub,
      email: payload.email,
      role: payload.role,
      companyId: payload.companyId
    };
  }
}

// roles.guard.ts
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>('roles', [
      context.getHandler(),
      context.getClass()
    ]);
    
    if (!requiredRoles) return true;

    const { user } = context.switchToHttp().getRequest();
    return requiredRoles.some(role => user.role === role);
  }
}
```

### Usage in Controllers
```typescript
// company.controller.ts
@Controller('v1/companies')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CompanyController {
  constructor(
    @Inject('ORGANIZATION_SERVICE') private orgClient: ClientGrpcProxy
  ) {}

  @Get()
  @Roles('SUPER_ADMIN', 'ADMIN', 'USER')
  async getAllCompanies() {
    return this.orgClient.send('list_companies', {});
  }

  @Post()
  @Roles('SUPER_ADMIN', 'ADMIN')
  async createCompany(@Body() dto: CreateCompanyDto, @User() user: any) {
    return this.orgClient.send('create_company', {
      ...dto,
      created_by: user.userId
    });
  }

  @Delete(':id')
  @Roles('SUPER_ADMIN')
  async deleteCompany(@Param('id') id: number) {
    return this.orgClient.send('delete_company', { companyId: id });
  }
}
```

---

## 5. Request Aggregation

### Use Case: Get Company with Full Organization Chart
Client needs company + functions + people in one request.

```typescript
// aggregation.controller.ts
@Controller('v1/aggregations')
@UseGuards(JwtAuthGuard)
export class AggregationController {
  constructor(
    @Inject('ORGANIZATION_SERVICE') private orgClient: ClientProxy,
    @Inject('HR_SERVICE') private hrClient: ClientProxy,
    @Inject('INFRASTRUCTURE_SERVICE') private infraClient: ClientProxy
  ) {}

  @Get('companies/:id/full')
  async getCompanyFull(@Param('id') companyId: number) {
    // Parallel requests to multiple services
    const [company, functions, people, buildings] = await Promise.all([
      firstValueFrom(this.orgClient.send('get_company', { companyId })),
      firstValueFrom(this.hrClient.send('get_functions', { companyId })),
      firstValueFrom(this.hrClient.send('get_people', { companyId })),
      firstValueFrom(this.infraClient.send('get_buildings', { companyId }))
    ]);

    return {
      company,
      organization: {
        functions,
        people
      },
      infrastructure: {
        buildings
      }
    };
  }

  @Get('processes/:id/workflow-details')
  async getProcessWorkflowDetails(@Param('id') processId: number) {
    // Get process with tasks
    const process = await firstValueFrom(
      this.processClient.send('get_process_with_tasks', { processId })
    );

    // Enrich tasks with job information from HR Service
    const jobIds = process.tasks.flatMap(t => t.jobIds);
    const jobs = await firstValueFrom(
      this.hrClient.send('get_jobs_by_ids', { jobIds })
    );

    // Enrich tasks with skill information from Skills Service
    const skillIds = process.tasks.flatMap(t => t.skillIds);
    const skills = await firstValueFrom(
      this.skillsClient.send('get_skills_by_ids', { skillIds })
    );

    return {
      ...process,
      tasks: process.tasks.map(task => ({
        ...task,
        jobs: jobs.filter(j => task.jobIds.includes(j.job_id)),
        skills: skills.filter(s => task.skillIds.includes(s.skill_id))
      }))
    };
  }
}
```

---

## 6. Caching Strategy

### Cache Layers
1. **Gateway-level cache**: For frequently accessed data
2. **CDN cache**: For static content and public endpoints
3. **Client-side cache**: Via HTTP cache headers

### Implementation
```typescript
// cache.interceptor.ts
@Injectable()
export class CacheInterceptor implements NestInterceptor {
  constructor(private cacheManager: Cache) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const cacheKey = `${request.method}:${request.url}`;

    // Only cache GET requests
    if (request.method !== 'GET') {
      return next.handle();
    }

    // Check cache
    const cachedResponse = await this.cacheManager.get(cacheKey);
    if (cachedResponse) {
      return of(cachedResponse);
    }

    // Cache miss - fetch and store
    return next.handle().pipe(
      tap(response => {
        this.cacheManager.set(cacheKey, response, { ttl: 300 }); // 5 min TTL
      })
    );
  }
}

// Usage
@Controller('v1/skills')
@UseInterceptors(CacheInterceptor)  // Cache all skill endpoints
export class SkillsController {
  @Get()
  async getAllSkills() {
    return this.skillsClient.send('list_skills', {});
  }
}
```

### Cache Invalidation
```typescript
// Event-driven cache invalidation
@Injectable()
export class CacheInvalidationService {
  constructor(
    private cacheManager: Cache,
    @Inject('EVENT_BUS') private eventBus: ClientProxy
  ) {}

  @OnModuleInit()
  subscribeToEvents() {
    this.eventBus.subscribe('*.*.updated').subscribe(event => {
      this.invalidateCache(event);
    });
  }

  async invalidateCache(event: DomainEvent) {
    const { eventType, payload } = event;
    
    if (eventType.startsWith('organization.company')) {
      await this.cacheManager.del(`GET:/v1/companies/${payload.companyId}`);
      await this.cacheManager.del('GET:/v1/companies');
    }
    
    if (eventType.startsWith('skills.skill')) {
      await this.cacheManager.del('GET:/v1/skills');
    }
  }
}
```

---

## 7. Rate Limiting

### Strategy
- **Per-User Limits**: Prevent abuse by individual users
- **Per-IP Limits**: Prevent DDoS attacks
- **Endpoint-Specific Limits**: Critical endpoints have stricter limits

### Implementation
```typescript
// rate-limit.middleware.ts
@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  private limiter = new Map<string, { count: number; resetTime: number }>();

  use(req: Request, res: Response, next: NextFunction) {
    const key = req.user?.userId || req.ip;
    const now = Date.now();
    const limit = 100; // requests per minute
    const window = 60000; // 1 minute

    let record = this.limiter.get(key);
    
    if (!record || now > record.resetTime) {
      record = { count: 0, resetTime: now + window };
      this.limiter.set(key, record);
    }

    record.count++;

    if (record.count > limit) {
      throw new HttpException('Rate limit exceeded', HttpStatus.TOO_MANY_REQUESTS);
    }

    next();
  }
}

// Apply globally
@Module({
  // ...
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RateLimitMiddleware).forRoutes('*');
  }
}
```

---

## 8. Error Handling & Circuit Breaker

### Unified Error Response
```typescript
// http-exception.filter.ts
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    const status = exception instanceof HttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message: exception.message || 'Internal server error',
      error: exception.name,
      correlationId: request.headers['x-correlation-id']
    };

    response.status(status).json(errorResponse);
  }
}
```

### Circuit Breaker
```typescript
// circuit-breaker.service.ts
@Injectable()
export class CircuitBreakerService {
  private circuits = new Map<string, CircuitState>();

  async execute<T>(
    serviceName: string,
    operation: () => Promise<T>,
    fallback?: () => T
  ): Promise<T> {
    const circuit = this.getOrCreateCircuit(serviceName);

    if (circuit.state === 'OPEN') {
      if (Date.now() - circuit.lastFailureTime > 30000) { // 30s timeout
        circuit.state = 'HALF_OPEN';
      } else {
        return fallback ? fallback() : Promise.reject(new Error('Circuit breaker open'));
      }
    }

    try {
      const result = await operation();
      this.onSuccess(circuit);
      return result;
    } catch (error) {
      this.onFailure(circuit);
      throw error;
    }
  }

  private onSuccess(circuit: CircuitState) {
    circuit.failureCount = 0;
    circuit.state = 'CLOSED';
  }

  private onFailure(circuit: CircuitState) {
    circuit.failureCount++;
    circuit.lastFailureTime = Date.now();
    
    if (circuit.failureCount >= 5) {
      circuit.state = 'OPEN';
    }
  }
}
```

---

## 9. Logging & Monitoring

### Correlation ID Tracking
```typescript
// correlation-id.middleware.ts
@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const correlationId = req.headers['x-correlation-id'] || uuidv4();
    req.headers['x-correlation-id'] = correlationId;
    res.setHeader('x-correlation-id', correlationId);
    next();
  }
}
```

### Request Logging
```typescript
// logging.interceptor.ts
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private logger = new Logger('APIGateway');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, headers } = request;
    const correlationId = headers['x-correlation-id'];
    const startTime = Date.now();

    this.logger.log(`→ ${method} ${url} [${correlationId}]`);

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - startTime;
        this.logger.log(`← ${method} ${url} [${correlationId}] ${duration}ms`);
      }),
      catchError(error => {
        const duration = Date.now() - startTime;
        this.logger.error(`✗ ${method} ${url} [${correlationId}] ${duration}ms - ${error.message}`);
        throw error;
      })
    );
  }
}
```

---

## 10. CORS Configuration

```typescript
// main.ts
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: [
      'http://localhost:3000',                              // CMS (dev)
      'https://crystalsystemcms-production.up.railway.app', // CMS (prod)
      'https://crystalsystem-3dapp-production.up.railway.app', // Unity
      /^https:\/\/.*\.vercel\.app$/                        // Vercel deployments
    ],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'x-correlation-id'],
    exposedHeaders: ['x-correlation-id']
  });

  await app.listen(3000);
}
```

---

## 11. Health Checks & Service Discovery

```typescript
// health.controller.ts
@Controller('health')
export class HealthController {
  constructor(
    @Inject('ORGANIZATION_SERVICE') private orgClient: ClientProxy,
    @Inject('HR_SERVICE') private hrClient: ClientProxy,
    @Inject('PROCESS_SERVICE') private processClient: ClientProxy
  ) {}

  @Get()
  async checkHealth() {
    const serviceChecks = await Promise.allSettled([
      this.checkService('organization', this.orgClient),
      this.checkService('hr', this.hrClient),
      this.checkService('process', this.processClient)
    ]);

    const status = serviceChecks.every(s => s.status === 'fulfilled') ? 'healthy' : 'degraded';

    return {
      status,
      timestamp: new Date().toISOString(),
      services: serviceChecks.map((result, index) => ({
        name: ['organization', 'hr', 'process'][index],
        status: result.status === 'fulfilled' ? 'up' : 'down'
      }))
    };
  }

  private async checkService(name: string, client: ClientProxy): Promise<boolean> {
    try {
      await firstValueFrom(client.send('health_check', {}).pipe(timeout(2000)));
      return true;
    } catch {
      return false;
    }
  }
}
```

---

## 12. Performance Optimization

### Response Compression
```typescript
// main.ts
import * as compression from 'compression';

app.use(compression());
```

### Request Timeout
```typescript
// timeout.interceptor.ts
@Injectable()
export class TimeoutInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(timeout(30000)); // 30 second timeout
  }
}
```

---

**Next Document**: `06_DEPLOYMENT_INFRASTRUCTURE_PLAN.md`
