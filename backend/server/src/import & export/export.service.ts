import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as XLSX from 'xlsx';

@Injectable()
export class ExportService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Truncate text to Excel's maximum cell length
   */
  private truncateText(text: string | null, maxLength: number = 32000): string {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '... [truncated]';
  }

  /**
   * Export all data to Excel file
   */
  async exportToExcel(companyName: string): Promise<Buffer> {
    // Get company
    const company = await this.prisma.company.findFirst({
      where: { name: companyName },
    });

    if (!company) {
      throw new Error(`Company "${companyName}" not found`);
    }

    const companyId = company.company_id;

    // Fetch all data
    const [companies, functions, jobs, tasks, processes, people, taskProcesses, jobTasks, functionJobs, peopleJobs] = await Promise.all([
      this.fetchCompanies(companyId),
      this.fetchFunctions(companyId),
      this.fetchJobs(companyId),
      this.fetchTasks(companyId),
      this.fetchProcesses(companyId),
      this.fetchPeople(companyId),
      this.fetchTaskProcesses(companyId),
      this.fetchJobTasks(companyId),
      this.fetchFunctionJobs(companyId),
      this.fetchPeopleJobs(companyId),
    ]);

    // Create workbook
    const workbook = XLSX.utils.book_new();

    // Add sheets in the same order as import (Company first)
    this.addSheet(workbook, 'Company', companies);
    this.addSheet(workbook, 'Function', functions);
    this.addSheet(workbook, 'Job', jobs);
    this.addSheet(workbook, 'Task', tasks);
    this.addSheet(workbook, 'Process', processes);
    this.addSheet(workbook, 'People', people);
    this.addSheet(workbook, 'Task-Process', taskProcesses);
    this.addSheet(workbook, 'Job-Task', jobTasks);
    this.addSheet(workbook, 'Function-Job', functionJobs);
    this.addSheet(workbook, 'people-job', peopleJobs);

    // Generate Excel file buffer
    const excelBuffer = XLSX.write(workbook, {
      type: 'buffer',
      bookType: 'xlsx',
    });

    return excelBuffer;
  }

  /**
   * Fetch Companies
   */
  private async fetchCompanies(companyId: number): Promise<any[]> {
    // For now, just return the current company
    // You could fetch all companies if needed
    const company = await this.prisma.company.findUnique({
      where: { company_id: companyId },
    });

    if (!company) return [];

    return [
      {
        'Company Code': company.companyCode,
        'Company Name': company.name,
      },
    ];
  }

  /**
   * Fetch Functions
   */
  private async fetchFunctions(companyId: number): Promise<any[]> {
    const functions = await this.prisma.function.findMany({
      where: { company_id: companyId },
      include: {
        company: true,
      },
    });

    return functions.map((func) => ({
      'Function Name': func.name,
      'Function Code': func.functionCode,
      'Background color': func.backgroundColor || '',
      'Company': func.company.name,
      'Parent Function Description': this.truncateText(func.overview),
    }));
  }

  /**
   * Fetch Jobs
   */
  private async fetchJobs(companyId: number): Promise<any[]> {
    const jobs = await this.prisma.job.findMany({
      where: { company_id: companyId },
      include: {
        Function: true,
        company: true,
        job_level: true,
      },
    });

    return jobs.map((job) => ({
      'Job Name': job.name,
      'Job Code': job.jobCode,
      'Hourly Rate': job.hourlyRate,
      'Max Hours Per Day': job.maxHoursPerDay,
      'Function': job.Function.functionCode,
      'Company': job.company.name,
      'Level Rank': job.job_level?.level_rank || 1,
      'Skills': '', // Skills are in a separate relationship
      'Skill Rank': '',
      'Job Description': this.truncateText(job.description),
    }));
  }

  /**
   * Fetch Tasks
   */
  private async fetchTasks(companyId: number): Promise<any[]> {
    const tasks = await this.prisma.task.findMany({
      where: { task_company_id: companyId },
      include: {
        company: true,
      },
    });

    return tasks.map((task) => ({
      'Task Name': task.task_name,
      'Task Code': task.task_code,
      'Capacity (minutes)': task.task_capacity_minutes,
      'Company': task.company.name,
      'Associated Jobs': '', // Jobs are in a separate relationship
      'Req Skills': '', // Skills are in a separate relationship
      'Skill Rank': '',
      'Task Description': this.truncateText(task.task_overview),
    }));
  }

  /**
   * Fetch Processes
   */
  private async fetchProcesses(companyId: number): Promise<any[]> {
    const processes = await this.prisma.process.findMany({
      where: { company_id: companyId },
      include: {
        company: true,
      },
    });

    return processes.map((process) => ({
      'Process Name': process.process_name,
      'Process Code': process.process_code,
      'Company': process.company.name,
      'Process Overview': this.truncateText(process.process_overview),
    }));
  }

  /**
   * Fetch People
   */
  private async fetchPeople(companyId: number): Promise<any[]> {
    const people = await this.prisma.people.findMany({
      where: { company_id: companyId },
      include: {
        company: true,
        job: true,
      },
    });

    return people.map((person) => ({
      'First Name': person.people_name,
      'Surname': person.people_surname,
      'Email': person.people_email,
      'Phone': person.people_phone || '',
      'Company': person.company.name,
      'Job': person.job?.jobCode || '',
      'Is Manager': person.is_manager ? 'Yes' : 'No',
    }));
  }

  /**
   * Fetch Task-Process relationships
   */
  private async fetchTaskProcesses(companyId: number): Promise<any[]> {
    const taskProcesses = await this.prisma.process_task.findMany({
      where: {
        task: {
          task_company_id: companyId,
        },
      },
      include: {
        task: true,
        process: true,
      },
      orderBy: {
        order: 'asc',
      },
    });

    return taskProcesses.map((tp) => ({
      'TaskCode': tp.task.task_code,
      'ProcessCode': tp.process.process_code,
      'Order': tp.order,
    }));
  }

  /**
   * Fetch Job-Task relationships
   */
  private async fetchJobTasks(companyId: number): Promise<any[]> {
    const jobTasks = await this.prisma.job_task.findMany({
      where: {
        job: {
          company_id: companyId,
        },
      },
      include: {
        job: true,
        task: true,
      },
    });

    return jobTasks.map((jt) => ({
      'TaskCode': jt.task.task_code,
      'JobCode': jt.job.jobCode,
    }));
  }

  /**
   * Fetch Function-Job relationships
   */
  private async fetchFunctionJobs(companyId: number): Promise<any[]> {
    const jobs = await this.prisma.job.findMany({
      where: { company_id: companyId },
      include: {
        Function: true,
      },
    });

    return jobs.map((job) => ({
      'Job Code': job.jobCode,
      'Function Code': job.Function.functionCode,
    }));
  }

  /**
   * Fetch People-Job relationships
   */
  private async fetchPeopleJobs(companyId: number): Promise<any[]> {
    const people = await this.prisma.people.findMany({
      where: {
        company_id: companyId,
        job_id: {
          not: undefined,
        },
      },
      include: {
        job: true,
      },
    });

    return people.map((person) => ({
      'people id': person.people_id,
      'job code': person.job?.jobCode || '',
    }));
  }

  /**
   * Helper method to add sheet to workbook
   */
  private addSheet(workbook: XLSX.WorkBook, sheetName: string, data: any[]): void {
    const worksheet = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  }
}
