// Company sheet data
export interface CompanySheetRow {
  'Company Name': string;
  'Company Code': string;
}

// Function sheet data
export interface FunctionSheetRow {
  'Function Name': string;
  'Function Code': string;
  'Background color': string;
  'Company Code': string;
  'Parent Function Code': string;
  'Description': string;
}

// Job sheet data
export interface JobSheetRow {
  'Job Name': string;
  'Job Code': string;
  'Hourly Rate': number;
  'Max Hours Per Day': number;
  'Function': string;
  'Company Code': string;
  'Level Rank': number;
  'Skills': string;
  'Skill Rank': number;
  'Job Description': string;
}

// Task sheet data
export interface TaskSheetRow {
  'Task Name': string;
  'Task Code': string;
  'Capacity (minutes)': number;
  'Company Code': string;
  'Associated Jobs': string;
  'Req Skills': string;
  'Skill Rank': number;
  'Task Description': string;
}

// Process sheet data
export interface ProcessSheetRow {
  'Process Name': string;
  'Process Code': string;
  'Company Code': string;
  'Process Overview': string;
}

// People sheet data
export interface PeopleSheetRow {
  'First Name': string;
  'Surname': string;
  'Email': string;
  'Phone': string;
  'Company Code': string;
  'Job Code': string;
  'Is Manager': string;
}

// Task-Process junction data
export interface TaskProcessSheetRow {
  'TaskCode': string;
  'ProcessCode': string;
  'Order': number;
}

// Job-Task junction data
export interface JobTaskSheetRow {
  'TaskCode': string;
  'JobCode': string;
}

// Function-Job junction data (if needed)
export interface FunctionJobSheetRow {
  'Job Code': string;
  'Function Code': string;
}

export interface ParsedExcelData {
  companies: CompanySheetRow[];
  functions: FunctionSheetRow[];
  jobs: JobSheetRow[];
  tasks: TaskSheetRow[];
  processes: ProcessSheetRow[];
  people: PeopleSheetRow[];
  taskProcess: TaskProcessSheetRow[];
  jobTask: JobTaskSheetRow[];
  functionJob: FunctionJobSheetRow[];
}
