# Digital Twin Enterprise API - Data Fetching Guide

This guide provides all GET endpoints for fetching data from the Digital Twin Enterprise system.

## 🔐 Authentication Required

**IMPORTANT: Login is necessary for all API endpoints**

### Base URL
```
https://server-digitaltwin-enterprise-production.up.railway.app
```

### Authentication Steps

1. **Login to get access token:**
```bash
POST https://server-digitaltwin-enterprise-production.up.railway.app/auth/login
Content-Type: application/json

{
  "email": "your-email@example.com",
  "password": "your-password"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "user_id": 1,
    "email": "user@example.com",
    "name": "User Name",
    "role": "ADMIN"
  }
}
```

2. **Use the token in all subsequent requests:**
```bash
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 📋 Available GET Endpoints

### 1. Companies
**Get all companies:**
```bash
GET /company
GET /company/with-relations
```

**Get specific company:**
```bash
GET /company/{id}
GET /company/{id}/with-relations
```

### 2. Jobs
**Get all jobs:**
```bash
GET /job
GET /job/with-relations
```

**Get specific job:**
```bash
GET /job/{id}
GET /job/{id}/with-relations
```

### 3. Tasks
**Get all tasks:**
```bash
GET /task
GET /task/with-relations
```

**Get specific task:**
```bash
GET /task/{id}
GET /task/{id}/with-relations
```

### 4. Processes
**Get all processes:**
```bash
GET /process
GET /process/with-relations
```

**Get specific process:**
```bash
GET /process/{id}
GET /process/{id}/with-relations
```

### 5. Skills
**Get all skills:**
```bash
GET /skill
GET /skill/with-relations
```

**Get specific skill:**
```bash
GET /skill/{id}
GET /skill/{id}/with-relations
```

### 6. People
**Get all people:**
```bash
GET /people
GET /people/with-relations
```

**Get specific person:**
```bash
GET /people/{id}
GET /people/{id}/with-relations
```

**Search person by code:**
```bash
GET /people/search?code={code}
```

### 7. Buildings
**Get all buildings:**
```bash
GET /building
GET /building/with-relations
```

**Get specific building:**
```bash
GET /building/{id}
GET /building/{id}/with-relations
```

### 8. Functions
**Get all functions:**
```bash
GET /function
GET /function/with-relations
```

**Get specific function:**
```bash
GET /function/{id}
GET /function/{id}/with-relations
```

---

## 🔍 Endpoint Types Explained

### Basic Endpoints
- Return only the core data of the entity
- Faster response times
- Use when you only need basic information

### With-Relations Endpoints
- Return complete data including all related entities
- Slower response times but more comprehensive data
- Use when you need full details and relationships

---

## 📝 Complete Request Examples

### Example 1: Get All Jobs with Relations
```bash
curl -X GET \
  "https://server-digitaltwin-enterprise-production.up.railway.app/job/with-relations" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json"
```

**Response:**
```json
[
  {
    "job_id": 1,
    "jobCode": "JOB001",
    "name": "Software Engineer",
    "description": "Develops software applications",
    "overview": "Responsible for designing, coding, and maintaining software systems...",
    "hourlyRate": 75.50,
    "maxHoursPerDay": 8,
    "company": {
      "company_id": 1,
      "name": "Tech Solutions Inc",
      "companyCode": "TSI001"
    },
    "Function": {
      "function_id": 2,
      "name": "Engineering",
      "functionCode": "ENG001"
    },
    "job_level": {
      "level_name": "PROFICIENT",
      "level_rank": 3
    },
    "jobSkills": [
      {
        "skill": {
          "name": "JavaScript",
          "description": "Programming language"
        },
        "skill_level": {
          "level_name": "ADVANCED"
        }
      }
    ],
    "jobTasks": [
      {
        "task": {
          "task_name": "Code Review",
          "task_code": "TSK010"
        }
      }
    ]
  }
]
```

### Example 2: Get Specific Task
```bash
curl -X GET \
  "https://server-digitaltwin-enterprise-production.up.railway.app/task/1/with-relations" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json"
```

### Example 3: Search Person by Code
```bash
curl -X GET \
  "https://server-digitaltwin-enterprise-production.up.railway.app/people/search?code=EMP001" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json"
```

---

## 🚨 Error Responses

### 401 Unauthorized
```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```
**Solution:** Check your access token or login again.

### 404 Not Found
```json
{
  "statusCode": 404,
  "message": "Job 999 not found",
  "error": "Not Found"
}
```
**Solution:** Verify the ID exists.

### 403 Forbidden
```json
{
  "statusCode": 403,
  "message": "Forbidden resource"
}
```
**Solution:** Check your user permissions.

---

## 💡 Integration Tips

### JavaScript/TypeScript Example
```javascript
class DigitalTwinAPI {
  constructor(baseUrl, accessToken) {
    this.baseUrl = baseUrl;
    this.accessToken = accessToken;
  }

  async request(endpoint) {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  // Get all jobs with relations
  async getAllJobs() {
    return this.request('/job/with-relations');
  }

  // Get specific job
  async getJob(id) {
    return this.request(`/job/${id}/with-relations`);
  }

  // Get all tasks
  async getAllTasks() {
    return this.request('/task/with-relations');
  }

  // Search person by code
  async searchPersonByCode(code) {
    return this.request(`/people/search?code=${code}`);
  }
}

// Usage
const api = new DigitalTwinAPI(
  'https://server-digitaltwin-enterprise-production.up.railway.app',
  'your-access-token'
);

// Fetch data
const jobs = await api.getAllJobs();
const task = await api.getTask(1);
```

### Python Example
```python
import requests

class DigitalTwinAPI:
    def __init__(self, base_url, access_token):
        self.base_url = base_url
        self.headers = {
            'Authorization': f'Bearer {access_token}',
            'Content-Type': 'application/json'
        }
    
    def get(self, endpoint):
        response = requests.get(f"{self.base_url}{endpoint}", headers=self.headers)
        response.raise_for_status()
        return response.json()
    
    def get_all_jobs(self):
        return self.get('/job/with-relations')
    
    def get_job(self, job_id):
        return self.get(f'/job/{job_id}/with-relations')

# Usage
api = DigitalTwinAPI(
    'https://server-digitaltwin-enterprise-production.up.railway.app',
    'your-access-token'
)

jobs = api.get_all_jobs()
```

---

## 📊 Data Structure Overview

### Key Entities and Their Relationships

- **Company** → Has Jobs, People, Buildings, Functions, Tasks, Processes
- **Job** → Belongs to Company and Function, Has Skills and Tasks, Assigned to People
- **Task** → Belongs to Company, Can be part of Processes and Jobs, Requires Skills
- **Process** → Belongs to Company, Contains ordered Tasks
- **People** → Belongs to Company, Assigned to Job
- **Skill** → Can be required by Jobs and Tasks with proficiency levels
- **Building** → Belongs to Company, Contains Floors and Rooms
- **Function** → Belongs to Company, Contains Jobs

### Skill Levels
- NOVICE (Level 1)
- INTERMEDIATE (Level 2) 
- PROFICIENT (Level 3)
- ADVANCED (Level 4)
- EXPERT (Level 5)

### Job Levels
- NOVICE
- INTERMEDIATE
- PROFICIENT
- ADVANCED
- EXPERT

---

## ⚡ Performance Recommendations

1. **Use basic endpoints** when you only need core data
2. **Use with-relations endpoints** when you need complete information
3. **Cache frequently accessed data** to reduce API calls
4. **Handle rate limits** gracefully
5. **Always include proper error handling**

---

## 🔧 Troubleshooting

### Common Issues:

1. **Token Expired**: Login again to get a new token
2. **CORS Errors**: Ensure your domain is whitelisted
3. **404 Errors**: Verify entity IDs exist
4. **403 Errors**: Check user permissions for the resource

### Support:
If you encounter issues, provide:
- Request URL
- Request headers
- Response status code
- Error message
