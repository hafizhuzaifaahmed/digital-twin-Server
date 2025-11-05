# Deployment & Infrastructure Plan

## Executive Summary
This document outlines the containerization, orchestration, deployment, monitoring, and operational strategies for the microservices architecture using Docker, Kubernetes, and modern DevOps practices.

---

## 1. Containerization Strategy

### Docker Architecture

Each microservice will be containerized with its own Dockerfile:

```
digital-twin-microservices/
├── api-gateway/
│   ├── Dockerfile
│   ├── .dockerignore
│   └── src/
├── services/
│   ├── auth-service/
│   │   ├── Dockerfile
│   │   └── src/
│   ├── organization-service/
│   │   ├── Dockerfile
│   │   └── src/
│   ├── hr-service/
│   │   ├── Dockerfile
│   │   └── src/
│   ├── process-service/
│   │   ├── Dockerfile
│   │   └── src/
│   ├── infrastructure-service/
│   │   ├── Dockerfile
│   │   └── src/
│   ├── skills-service/
│   │   ├── Dockerfile
│   │   └── src/
│   └── integration-service/
│       ├── Dockerfile
│       └── src/
├── docker-compose.yml
├── docker-compose.prod.yml
└── kubernetes/
    └── [K8s manifests]
```

### Standard Dockerfile Template

```dockerfile
# Base image - multi-stage build
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci --only=production && \
    npm cache clean --force

# Copy application code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build TypeScript
RUN npm run build

# Production image
FROM node:18-alpine AS production

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

# Copy built application
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/prisma ./prisma

# Switch to non-root user
USER nestjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => r.statusCode === 200 ? process.exit(0) : process.exit(1))"

# Start application
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main"]
```

### .dockerignore
```
node_modules
npm-debug.log
dist
.git
.env
.env.local
README.md
Dockerfile
.dockerignore
coverage
.vscode
```

---

## 2. Docker Compose for Local Development

### docker-compose.yml
```yaml
version: '3.8'

services:
  # Databases
  auth-db:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD}
      MYSQL_DATABASE: auth_db
    volumes:
      - auth-db-data:/var/lib/mysql
    ports:
      - "3306:3306"
    networks:
      - backend

  organization-db:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD}
      MYSQL_DATABASE: organization_db
    volumes:
      - org-db-data:/var/lib/mysql
    networks:
      - backend

  hr-db:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD}
      MYSQL_DATABASE: hr_db
    volumes:
      - hr-db-data:/var/lib/mysql
    networks:
      - backend

  process-db:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD}
      MYSQL_DATABASE: process_db
    volumes:
      - process-db-data:/var/lib/mysql
    networks:
      - backend

  infrastructure-db:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD}
      MYSQL_DATABASE: infrastructure_db
    volumes:
      - infra-db-data:/var/lib/mysql
    networks:
      - backend

  skills-db:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD}
      MYSQL_DATABASE: skills_db
    volumes:
      - skills-db-data:/var/lib/mysql
    networks:
      - backend

  # Message Broker
  rabbitmq:
    image: rabbitmq:3.12-management-alpine
    environment:
      RABBITMQ_DEFAULT_USER: ${RABBITMQ_USER}
      RABBITMQ_DEFAULT_PASS: ${RABBITMQ_PASS}
    ports:
      - "5672:5672"   # AMQP
      - "15672:15672" # Management UI
    volumes:
      - rabbitmq-data:/var/lib/rabbitmq
    networks:
      - backend

  # Redis for caching
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    networks:
      - backend

  # Microservices
  auth-service:
    build:
      context: ./services/auth-service
      dockerfile: Dockerfile
    environment:
      DATABASE_URL: mysql://root:${MYSQL_ROOT_PASSWORD}@auth-db:3306/auth_db
      JWT_SECRET: ${JWT_SECRET}
      RABBITMQ_URL: amqp://${RABBITMQ_USER}:${RABBITMQ_PASS}@rabbitmq:5672
    depends_on:
      - auth-db
      - rabbitmq
    networks:
      - backend
    ports:
      - "3001:3000"

  organization-service:
    build:
      context: ./services/organization-service
      dockerfile: Dockerfile
    environment:
      DATABASE_URL: mysql://root:${MYSQL_ROOT_PASSWORD}@organization-db:3306/organization_db
      RABBITMQ_URL: amqp://${RABBITMQ_USER}:${RABBITMQ_PASS}@rabbitmq:5672
      AUTH_SERVICE_URL: http://auth-service:3000
    depends_on:
      - organization-db
      - rabbitmq
      - auth-service
    networks:
      - backend
    ports:
      - "3002:3000"

  hr-service:
    build:
      context: ./services/hr-service
      dockerfile: Dockerfile
    environment:
      DATABASE_URL: mysql://root:${MYSQL_ROOT_PASSWORD}@hr-db:3306/hr_db
      RABBITMQ_URL: amqp://${RABBITMQ_USER}:${RABBITMQ_PASS}@rabbitmq:5672
      ORGANIZATION_SERVICE_URL: http://organization-service:3000
      SKILLS_SERVICE_URL: http://skills-service:3000
      REDIS_URL: redis://redis:6379
    depends_on:
      - hr-db
      - rabbitmq
      - redis
    networks:
      - backend
    ports:
      - "3003:3000"

  process-service:
    build:
      context: ./services/process-service
      dockerfile: Dockerfile
    environment:
      DATABASE_URL: mysql://root:${MYSQL_ROOT_PASSWORD}@process-db:3306/process_db
      RABBITMQ_URL: amqp://${RABBITMQ_USER}:${RABBITMQ_PASS}@rabbitmq:5672
      ORGANIZATION_SERVICE_URL: http://organization-service:3000
      HR_SERVICE_URL: http://hr-service:3000
      SKILLS_SERVICE_URL: http://skills-service:3000
    depends_on:
      - process-db
      - rabbitmq
    networks:
      - backend
    ports:
      - "3004:3000"

  infrastructure-service:
    build:
      context: ./services/infrastructure-service
      dockerfile: Dockerfile
    environment:
      DATABASE_URL: mysql://root:${MYSQL_ROOT_PASSWORD}@infrastructure-db:3306/infrastructure_db
      RABBITMQ_URL: amqp://${RABBITMQ_USER}:${RABBITMQ_PASS}@rabbitmq:5672
      ORGANIZATION_SERVICE_URL: http://organization-service:3000
    depends_on:
      - infrastructure-db
      - rabbitmq
    networks:
      - backend
    ports:
      - "3005:3000"

  skills-service:
    build:
      context: ./services/skills-service
      dockerfile: Dockerfile
    environment:
      DATABASE_URL: mysql://root:${MYSQL_ROOT_PASSWORD}@skills-db:3306/skills_db
      RABBITMQ_URL: amqp://${RABBITMQ_USER}:${RABBITMQ_PASS}@rabbitmq:5672
      REDIS_URL: redis://redis:6379
    depends_on:
      - skills-db
      - rabbitmq
      - redis
    networks:
      - backend
    ports:
      - "3006:3000"

  # API Gateway
  api-gateway:
    build:
      context: ./api-gateway
      dockerfile: Dockerfile
    environment:
      JWT_SECRET: ${JWT_SECRET}
      AUTH_SERVICE_URL: http://auth-service:3000
      ORGANIZATION_SERVICE_URL: http://organization-service:3000
      HR_SERVICE_URL: http://hr-service:3000
      PROCESS_SERVICE_URL: http://process-service:3000
      INFRASTRUCTURE_SERVICE_URL: http://infrastructure-service:3000
      SKILLS_SERVICE_URL: http://skills-service:3000
      REDIS_URL: redis://redis:6379
    depends_on:
      - auth-service
      - organization-service
      - hr-service
      - process-service
      - infrastructure-service
      - skills-service
      - redis
    networks:
      - backend
    ports:
      - "3000:3000"

volumes:
  auth-db-data:
  org-db-data:
  hr-db-data:
  process-db-data:
  infra-db-data:
  skills-db-data:
  rabbitmq-data:
  redis-data:

networks:
  backend:
    driver: bridge
```

---

## 3. Kubernetes Deployment

### Cluster Architecture

```
Kubernetes Cluster
├── Namespace: digital-twin-prod
├── Ingress Controller (NGINX)
├── Services:
│   ├── api-gateway (LoadBalancer)
│   ├── auth-service (ClusterIP)
│   ├── organization-service (ClusterIP)
│   ├── hr-service (ClusterIP)
│   ├── process-service (ClusterIP)
│   ├── infrastructure-service (ClusterIP)
│   └── skills-service (ClusterIP)
├── Databases (StatefulSets):
│   ├── auth-db
│   ├── organization-db
│   ├── hr-db
│   ├── process-db
│   ├── infrastructure-db
│   └── skills-db
├── Message Broker:
│   └── rabbitmq (StatefulSet)
└── Monitoring:
    ├── Prometheus
    ├── Grafana
    └── ELK Stack
```

### Namespace Configuration

```yaml
# namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: digital-twin-prod
  labels:
    name: digital-twin-prod
    environment: production
```

### ConfigMap for Environment Variables

```yaml
# configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: digital-twin-config
  namespace: digital-twin-prod
data:
  NODE_ENV: "production"
  LOG_LEVEL: "info"
  RABBITMQ_HOST: "rabbitmq-service"
  REDIS_HOST: "redis-service"
  AUTH_SERVICE_URL: "http://auth-service:3000"
  ORGANIZATION_SERVICE_URL: "http://organization-service:3000"
  HR_SERVICE_URL: "http://hr-service:3000"
  PROCESS_SERVICE_URL: "http://process-service:3000"
  INFRASTRUCTURE_SERVICE_URL: "http://infrastructure-service:3000"
  SKILLS_SERVICE_URL: "http://skills-service:3000"
```

### Secrets Management

```yaml
# secrets.yaml (encrypted with sealed-secrets or external secrets operator)
apiVersion: v1
kind: Secret
metadata:
  name: digital-twin-secrets
  namespace: digital-twin-prod
type: Opaque
data:
  JWT_SECRET: <base64-encoded-secret>
  MYSQL_ROOT_PASSWORD: <base64-encoded-password>
  RABBITMQ_USER: <base64-encoded-user>
  RABBITMQ_PASS: <base64-encoded-pass>
```

### Example Service Deployment (HR Service)

```yaml
# hr-service-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: hr-service
  namespace: digital-twin-prod
  labels:
    app: hr-service
    version: v1
spec:
  replicas: 3
  selector:
    matchLabels:
      app: hr-service
  template:
    metadata:
      labels:
        app: hr-service
        version: v1
    spec:
      containers:
      - name: hr-service
        image: your-registry.com/digital-twin/hr-service:latest
        imagePullPolicy: Always
        ports:
        - containerPort: 3000
          name: http
        env:
        - name: DATABASE_URL
          value: "mysql://root:$(MYSQL_ROOT_PASSWORD)@hr-db-service:3306/hr_db"
        - name: MYSQL_ROOT_PASSWORD
          valueFrom:
            secretKeyRef:
              name: digital-twin-secrets
              key: MYSQL_ROOT_PASSWORD
        - name: RABBITMQ_URL
          value: "amqp://$(RABBITMQ_USER):$(RABBITMQ_PASS)@rabbitmq-service:5672"
        - name: RABBITMQ_USER
          valueFrom:
            secretKeyRef:
              name: digital-twin-secrets
              key: RABBITMQ_USER
        - name: RABBITMQ_PASS
          valueFrom:
            secretKeyRef:
              name: digital-twin-secrets
              key: RABBITMQ_PASS
        envFrom:
        - configMapRef:
            name: digital-twin-config
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 3
---
apiVersion: v1
kind: Service
metadata:
  name: hr-service
  namespace: digital-twin-prod
spec:
  type: ClusterIP
  selector:
    app: hr-service
  ports:
  - port: 3000
    targetPort: 3000
    protocol: TCP
    name: http
```

### Horizontal Pod Autoscaler

```yaml
# hr-service-hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: hr-service-hpa
  namespace: digital-twin-prod
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: hr-service
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
      - type: Percent
        value: 100
        periodSeconds: 60
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 50
        periodSeconds: 60
```

### API Gateway Ingress

```yaml
# ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: digital-twin-ingress
  namespace: digital-twin-prod
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/rate-limit: "100"
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
spec:
  tls:
  - hosts:
    - api.digitaltwin.com
    secretName: digitaltwin-tls
  rules:
  - host: api.digitaltwin.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: api-gateway
            port:
              number: 3000
```

---

## 4. Database Deployment (StatefulSets)

```yaml
# hr-db-statefulset.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: hr-db
  namespace: digital-twin-prod
spec:
  serviceName: hr-db-service
  replicas: 1
  selector:
    matchLabels:
      app: hr-db
  template:
    metadata:
      labels:
        app: hr-db
    spec:
      containers:
      - name: mysql
        image: mysql:8.0
        env:
        - name: MYSQL_ROOT_PASSWORD
          valueFrom:
            secretKeyRef:
              name: digital-twin-secrets
              key: MYSQL_ROOT_PASSWORD
        - name: MYSQL_DATABASE
          value: hr_db
        ports:
        - containerPort: 3306
          name: mysql
        volumeMounts:
        - name: hr-db-storage
          mountPath: /var/lib/mysql
        resources:
          requests:
            memory: "2Gi"
            cpu: "1000m"
          limits:
            memory: "4Gi"
            cpu: "2000m"
  volumeClaimTemplates:
  - metadata:
      name: hr-db-storage
    spec:
      accessModes: [ "ReadWriteOnce" ]
      storageClassName: fast-ssd
      resources:
        requests:
          storage: 50Gi
---
apiVersion: v1
kind: Service
metadata:
  name: hr-db-service
  namespace: digital-twin-prod
spec:
  type: ClusterIP
  clusterIP: None
  selector:
    app: hr-db
  ports:
  - port: 3306
    targetPort: 3306
```

---

## 5. Monitoring & Observability

### Prometheus Configuration

```yaml
# prometheus-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-config
  namespace: digital-twin-prod
data:
  prometheus.yml: |
    global:
      scrape_interval: 15s
      evaluation_interval: 15s
    
    scrape_configs:
      - job_name: 'api-gateway'
        kubernetes_sd_configs:
        - role: pod
          namespaces:
            names:
            - digital-twin-prod
        relabel_configs:
        - source_labels: [__meta_kubernetes_pod_label_app]
          regex: api-gateway
          action: keep
        - source_labels: [__meta_kubernetes_pod_ip]
          target_label: __address__
          replacement: ${1}:3000

      - job_name: 'microservices'
        kubernetes_sd_configs:
        - role: pod
          namespaces:
            names:
            - digital-twin-prod
        relabel_configs:
        - source_labels: [__meta_kubernetes_pod_label_app]
          regex: (auth|organization|hr|process|infrastructure|skills)-service
          action: keep
```

### Grafana Dashboards
- **Service Health Dashboard**: Service uptime, response times, error rates
- **Database Performance**: Query performance, connection pools, slow queries
- **Business Metrics**: Companies created, people registered, processes executed
- **Infrastructure**: CPU, memory, network usage per service

### ELK Stack for Centralized Logging

```yaml
# filebeat-configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: filebeat-config
  namespace: digital-twin-prod
data:
  filebeat.yml: |
    filebeat.inputs:
    - type: container
      paths:
        - /var/log/containers/*digital-twin*.log
      
    processors:
    - add_kubernetes_metadata:
        host: ${NODE_NAME}
        matchers:
        - logs_path:
            logs_path: "/var/log/containers/"
    
    output.elasticsearch:
      hosts: ['${ELASTICSEARCH_HOST}:${ELASTICSEARCH_PORT}']
      username: ${ELASTICSEARCH_USERNAME}
      password: ${ELASTICSEARCH_PASSWORD}
```

---

## 6. CI/CD Pipeline

### GitHub Actions Workflow

```yaml
# .github/workflows/deploy.yml
name: Build and Deploy

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

env:
  REGISTRY: ghcr.io
  IMAGE_PREFIX: ${{ github.repository }}

jobs:
  build-and-test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        service: [auth, organization, hr, process, infrastructure, skills, api-gateway]
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Set up Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
        cache-dependency-path: services/${{ matrix.service }}-service/package-lock.json
    
    - name: Install dependencies
      working-directory: services/${{ matrix.service }}-service
      run: npm ci
    
    - name: Run tests
      working-directory: services/${{ matrix.service }}-service
      run: npm test
    
    - name: Build Docker image
      run: |
        docker build -t ${{ env.REGISTRY }}/${{ env.IMAGE_PREFIX }}/${{ matrix.service }}-service:${{ github.sha }} \
          services/${{ matrix.service }}-service
    
    - name: Log in to Container Registry
      if: github.event_name != 'pull_request'
      uses: docker/login-action@v2
      with:
        registry: ${{ env.REGISTRY }}
        username: ${{ github.actor }}
        password: ${{ secrets.GITHUB_TOKEN }}
    
    - name: Push Docker image
      if: github.event_name != 'pull_request'
      run: |
        docker push ${{ env.REGISTRY }}/${{ env.IMAGE_PREFIX }}/${{ matrix.service }}-service:${{ github.sha }}
        docker tag ${{ env.REGISTRY }}/${{ env.IMAGE_PREFIX }}/${{ matrix.service }}-service:${{ github.sha }} \
          ${{ env.REGISTRY }}/${{ env.IMAGE_PREFIX }}/${{ matrix.service }}-service:latest
        docker push ${{ env.REGISTRY }}/${{ env.IMAGE_PREFIX }}/${{ matrix.service }}-service:latest

  deploy-to-k8s:
    needs: build-and-test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Set up kubectl
      uses: azure/setup-kubectl@v3
    
    - name: Configure kubectl
      run: |
        echo "${{ secrets.KUBECONFIG }}" | base64 -d > kubeconfig.yaml
        export KUBECONFIG=kubeconfig.yaml
    
    - name: Deploy to Kubernetes
      run: |
        kubectl apply -f kubernetes/namespace.yaml
        kubectl apply -f kubernetes/configmap.yaml
        kubectl apply -f kubernetes/secrets.yaml
        kubectl apply -f kubernetes/deployments/
        kubectl rollout status deployment/api-gateway -n digital-twin-prod
```

---

## 7. Environment Configuration

### Development (.env)
```env
NODE_ENV=development
LOG_LEVEL=debug
MYSQL_ROOT_PASSWORD=dev_password
JWT_SECRET=dev_secret_change_in_prod
RABBITMQ_USER=admin
RABBITMQ_PASS=admin123
```

### Production (Kubernetes Secrets)
All sensitive values stored in Kubernetes Secrets or external secret managers (AWS Secrets Manager, HashiCorp Vault).

---

## 8. Backup & Disaster Recovery

### Database Backup Strategy
```yaml
# backup-cronjob.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: database-backup
  namespace: digital-twin-prod
spec:
  schedule: "0 2 * * *"  # Daily at 2 AM
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: backup
            image: mysql:8.0
            command:
            - /bin/sh
            - -c
            - |
              mysqldump -h hr-db-service -u root -p$MYSQL_ROOT_PASSWORD hr_db | \
              gzip > /backup/hr_db_$(date +\%Y\%m\%d).sql.gz
              # Upload to S3/GCS
              aws s3 cp /backup/hr_db_$(date +\%Y\%m\%d).sql.gz s3://digitaltwin-backups/
            env:
            - name: MYSQL_ROOT_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: digital-twin-secrets
                  key: MYSQL_ROOT_PASSWORD
            volumeMounts:
            - name: backup-storage
              mountPath: /backup
          restartPolicy: OnFailure
          volumes:
          - name: backup-storage
            emptyDir: {}
```

---

## 9. Cost Optimization

### Resource Allocation

| Service | CPU Request | CPU Limit | Memory Request | Memory Limit | Replicas |
|---------|-------------|-----------|----------------|--------------|----------|
| API Gateway | 500m | 1000m | 512Mi | 1Gi | 3-10 |
| Auth Service | 250m | 500m | 256Mi | 512Mi | 2-5 |
| Organization Service | 250m | 500m | 256Mi | 512Mi | 2-4 |
| HR Service | 500m | 1000m | 512Mi | 1Gi | 3-10 |
| Process Service | 500m | 1000m | 512Mi | 1Gi | 3-8 |
| Infrastructure Service | 250m | 500m | 256Mi | 512Mi | 2-5 |
| Skills Service | 250m | 500m | 256Mi | 512Mi | 2-4 |

**Total Resources**:
- **Minimum**: ~3 vCPU, ~6GB RAM
- **Maximum** (under load): ~45 vCPU, ~45GB RAM

---

**Next Document**: `07_INCREMENTAL_MIGRATION_ROADMAP.md`
