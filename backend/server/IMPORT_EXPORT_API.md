# Import/Export API Documentation

## Overview
The Import/Export API allows you to import and export company data in Excel format. All endpoints require JWT authentication.

## Authentication
All endpoints require a valid JWT token. First, login to get the token:

```bash
POST /auth/login
Content-Type: application/json

{
  "email": "superadmin@example.com",
  "password": "ChangeMe123!"
}
```

Response:
```json
{
  "access_token": "eyJhbGc..."
}
```

Use this token in the `Authorization` header for all import/export requests:
```
Authorization: Bearer <access_token>
```

---

## Import Endpoints

### 1. Import Excel File
**Endpoint:** `POST /import/excel`

**Description:** Import data from an Excel file into the database. Supports dry run mode for testing.

**Headers:**
- `Authorization: Bearer <token>`
- `Content-Type: multipart/form-data`

**Form Data:**
- `file`: Excel file (.xlsx)
- `companyName`: Company name (optional, default: "Maldova Hospital")
- `dryRun`: "true" or "false" (optional, default: "false")
  - `true`: Test import without saving to database
  - `false`: Actually save data to database

**Example Request (PowerShell):**
```powershell
$headers = @{ Authorization = "Bearer $token" }
$form = @{
    file = Get-Item "C:\path\to\data.xlsx"
    companyName = "Maldova Hospital"
    dryRun = "true"
}
Invoke-WebRequest -Uri "http://localhost:3001/import/excel" -Method POST -Form $form -Headers $headers
```

**Response:**
```json
{
  "success": true,
  "message": "Dry run completed successfully (no data saved)",
  "summary": {
    "totalSheets": 7,
    "totalRecords": 22,
    "imported": 0,
    "skipped": 21,
    "failed": 0
  },
  "details": {
    "Function": {
      "imported": 0,
      "skipped": 2,
      "failed": 0,
      "errors": []
    },
    "Job": { ... },
    "Task": { ... },
    ...
  }
}
```

### 2. Validate Excel File
**Endpoint:** `POST /import/validate`

**Description:** Validate Excel file structure and preview data without importing.

**Headers:**
- `Authorization: Bearer <token>`
- `Content-Type: multipart/form-data`

**Form Data:**
- `file`: Excel file (.xlsx)

**Response:**
```json
{
  "valid": true,
  "missingSheets": [],
  "foundSheets": [
    "Process",
    "Task",
    "Job",
    "Function",
    "People",
    "Task-Process",
    "Job-Task",
    "Function-Job",
    "people-job"
  ],
  "rowCounts": {
    "functions": 2,
    "jobs": 3,
    "tasks": 5,
    "processes": 1,
    "people": 1,
    "taskProcess": 5,
    "jobTask": 5,
    "functionJob": 3,
    "peopleJob": 1
  }
}
```

---

## Export Endpoint

### Export Company Data to Excel
**Endpoint:** `GET /import/export`

**Description:** Export all company data to an Excel file in the same format as import.

**Headers:**
- `Authorization: Bearer <token>`

**Query Parameters:**
- `companyName`: Company name to export (optional, default: "Maldova Hospital")

**Example Request (PowerShell):**
```powershell
$headers = @{ Authorization = "Bearer $token" }
$companyName = "Maldova Hospital"
$outputFile = "C:\Users\basit\Desktop\exported_data.xlsx"
$url = "http://localhost:3001/import/export?companyName=$([System.Uri]::EscapeDataString($companyName))"

Invoke-WebRequest -Uri $url -Method GET -Headers $headers -OutFile $outputFile
```

**Response:**
- Content-Type: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- Content-Disposition: `attachment; filename="Maldova_Hospital_export_2025-10-22.xlsx"`
- Body: Excel file binary data

**Exported Excel Structure:**
The exported file contains the following sheets in this order:
1. **Function** - All functions for the company
2. **Job** - All jobs for the company
3. **Task** - All tasks for the company
4. **Process** - All processes for the company
5. **People** - All people for the company
6. **Task-Process** - Task-Process relationships
7. **Job-Task** - Job-Task relationships
8. **Function-Job** - Function-Job relationships
9. **people-job** - People-Job relationships

---

## Excel File Format

### Required Sheets

#### Function Sheet
| Column Name | Type | Description |
|------------|------|-------------|
| Function Name | String | Name of the function |
| Function Code | String | Unique function code |
| Background color | String | Color code (optional) |
| Company | String | Company name |
| Parent Function Description | String | Description (optional) |

#### Job Sheet
| Column Name | Type | Description |
|------------|------|-------------|
| Job Name | String | Name of the job |
| Job Code | String | Unique job code |
| Hourly Rate | Number | Hourly rate |
| Max Hours Per Day | Number | Maximum hours per day |
| Function | String | Function code (must exist) |
| Company | String | Company name |
| Level Rank | Number | Job level rank (1-5) |
| Job Description | String | Job description |

#### Task Sheet
| Column Name | Type | Description |
|------------|------|-------------|
| Task Name | String | Name of the task |
| Task Code | String | Unique task code |
| Capacity (minutes) | Number | Task capacity in minutes |
| Company | String | Company name |
| Task Description | String | Task description |

#### Process Sheet
| Column Name | Type | Description |
|------------|------|-------------|
| Process Name | String | Name of the process |
| Process Code | String | Unique process code |
| Company | String | Company name |
| Process Overview | String | Process overview |

#### Task-Process Sheet
| Column Name | Type | Description |
|------------|------|-------------|
| TaskCode | String | Task code (must exist) |
| ProcessCode | String | Process code (must exist) |
| Order | Number | Order/sequence number |

#### Job-Task Sheet
| Column Name | Type | Description |
|------------|------|-------------|
| TaskCode | String | Task code (must exist) |
| JobCode | String | Job code (must exist) |

#### People Sheet (Optional)
| Column Name | Type | Description |
|------------|------|-------------|
| First Name | String | Person's first name |
| Surname | String | Person's surname |
| Email | String | Person's email |
| Phone | String | Phone number (optional) |
| Company | String | Company name |
| Job | String | Job code (optional) |
| Is Manager | String | "Yes" or "No" |

---

## Import Behavior

### Data Handling
- **Existing Records**: Automatically skipped (duplicate detection by unique codes)
- **Missing References**: Relationships referencing non-existent entities are skipped with a warning
- **Multiple Processes**: Fully supported - all processes in the Excel file will be imported
- **Transaction Safety**: All imports are wrapped in a transaction - if any error occurs, changes are rolled back

### Import Order
Data is imported in this specific order to maintain referential integrity:
1. Company (created if doesn't exist)
2. Functions
3. Jobs
4. Tasks
5. Processes
6. Task-Process relationships
7. Job-Task relationships
8. People

### Dry Run Mode
When `dryRun=true`:
- Validates all data
- Performs all checks
- Shows what would be imported/skipped
- **Does NOT save any data to database**
- Useful for testing before actual import

---

## Testing Scripts

### Test Import (Dry Run)
Run `test-import-auth.ps1` to test import with dry run:
```powershell
.\test-import-auth.ps1
```

### Test Export
Run `test-export.ps1` to export data:
```powershell
.\test-export.ps1
```

---

## Error Handling

### Common Errors

1. **401 Unauthorized**
   - Cause: Missing or invalid JWT token
   - Solution: Login first to get a valid token

2. **400 Bad Request - Missing required sheets**
   - Cause: Excel file doesn't have required sheets
   - Solution: Ensure file has all required sheets (Function, Job, Task, Process, Task-Process, Job-Task)

3. **400 Bad Request - Invalid file type**
   - Cause: File is not .xlsx format
   - Solution: Save file as Excel Workbook (.xlsx)

4. **400 Bad Request - Unsupported ZIP Compression**
   - Cause: Excel file uses newer compression method
   - Solution: Open in Excel and save as "Excel Workbook (.xlsx)" (not Strict Open XML)

5. **Company not found** (Export)
   - Cause: Specified company doesn't exist
   - Solution: Verify company name or create company first

---

## Best Practices

1. **Always test with dry run first** before actual import
2. **Validate Excel file** using `/import/validate` endpoint
3. **Check export file** to understand the expected format
4. **Keep backup** of your data before importing
5. **Use consistent naming** for codes (avoid special characters)
6. **Test with small datasets** first
7. **Export regularly** to back up your data

---

## Integration Guide for Frontend Developers

### Import Flow
```javascript
// 1. Login
const loginResponse = await fetch('http://localhost:3001/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'superadmin@example.com',
    password: 'ChangeMe123!'
  })
});
const { access_token } = await loginResponse.json();

// 2. Import with dry run
const formData = new FormData();
formData.append('file', fileInput.files[0]);
formData.append('companyName', 'Maldova Hospital');
formData.append('dryRun', 'true');

const importResponse = await fetch('http://localhost:3001/import/excel', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${access_token}` },
  body: formData
});
const result = await importResponse.json();
console.log('Dry run result:', result);

// 3. If dry run successful, do actual import
formData.set('dryRun', 'false');
const actualImportResponse = await fetch('http://localhost:3001/import/excel', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${access_token}` },
  body: formData
});
```

### Export Flow
```javascript
// 1. Login (same as above)

// 2. Export data
const exportResponse = await fetch(
  'http://localhost:3001/import/export?companyName=Maldova Hospital',
  {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${access_token}` }
  }
);

// 3. Download file
const blob = await exportResponse.blob();
const url = window.URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = 'exported_data.xlsx';
a.click();
```

---

## Swagger Documentation

Access interactive API documentation at:
```
http://localhost:3001/api
```

Navigate to the "Import" section to test all endpoints interactively.

---

## Support

For issues or questions:
1. Check the error message in the response
2. Verify Excel file format matches the documentation
3. Test with the provided PowerShell scripts
4. Check server logs for detailed error information
