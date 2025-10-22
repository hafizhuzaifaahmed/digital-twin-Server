// Function sheet data
export interface FunctionSheetRow {
  'Function Name': string;
  'Function Code': string;
  'Background color': string;
  'Company': string;
  'Parent Function Description': string;
}

// Job sheet data
export interface JobSheetRow {
  'Job Name': string;
  'Job Code': string;
  'Hourly Rate': number;
  'Max Hours Per Day': number;
  'Function': string;
  'Company': string;
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
  'Company': string;
  'Associated Jobs': string;
  'Req Skills': string;
  'Skill Rank': number;
  'Task Description': string;
}

// Process sheet data
export interface ProcessSheetRow {
  'Process Name': string;
  'Process Code': string;
  'Company': string;
  'Process Overview': string;
}

// People sheet data
export interface PeopleSheetRow {
  'First Name': string;
  'Surname': string;
  'Email': string;
  'Phone': string;
  'Company': string;
  'Job': string;
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

// People-Job junction data (if needed)
export interface PeopleJobSheetRow {
  'people id': number;
  'job code': string;
}

export interface ParsedExcelData {
  functions: FunctionSheetRow[];
  jobs: JobSheetRow[];
  tasks: TaskSheetRow[];
  processes: ProcessSheetRow[];
  people: PeopleSheetRow[];
  taskProcess: TaskProcessSheetRow[];
  jobTask: JobTaskSheetRow[];
  functionJob: FunctionJobSheetRow[];
  peopleJob: PeopleJobSheetRow[];
}
