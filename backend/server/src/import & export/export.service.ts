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
   * Export all data to Excel file by Process IDs
   */
  async exportToExcel(processIds: number[]): Promise<Buffer> {
    if (!processIds || processIds.length === 0) {
      throw new Error('At least one process ID is required');
    }

    // Get processes
    const processes = await this.prisma.process.findMany({
      where: { 
        process_id: {
          in: processIds,
        },
      },
      include: {
        company: true,
      },
    });

    if (processes.length === 0) {
      throw new Error('No processes found with the provided IDs');
    }

    // Get all unique company IDs from the processes
    const companyIds = [...new Set(processes.map(p => p.company_id))];

    // Fetch all data related to these specific processes
    const [companies, functions, jobs, tasks, allProcesses, people, taskProcesses, jobTasks, functionJobs] = await Promise.all([
      this.fetchCompaniesByIds(companyIds),
      this.fetchFunctionsForProcesses(processIds),
      this.fetchJobsForProcesses(processIds),
      this.fetchTasksForProcesses(processIds),
      this.fetchProcessesByIds(processIds),
      this.fetchPeopleForProcesses(processIds),
      this.fetchTaskProcessesForProcesses(processIds),
      this.fetchJobTasksForProcesses(processIds),
      this.fetchFunctionJobsForProcesses(processIds),
    ]);

    // Create workbook
    const workbook = XLSX.utils.book_new();

    // Add sheets in the same order as import (Company first)
    this.addSheet(workbook, 'Company', companies);
    this.addSheet(workbook, 'Function', functions);
    this.addSheet(workbook, 'Job', jobs);
    this.addSheet(workbook, 'Task', tasks);
    this.addSheet(workbook, 'Process', allProcesses);
    this.addSheet(workbook, 'People', people);
    this.addSheet(workbook, 'Task-Process', taskProcesses);
    this.addSheet(workbook, 'Job-Task', jobTasks);
    this.addSheet(workbook, 'Function-Job', functionJobs);

    // Generate Excel file buffer
    const excelBuffer = XLSX.write(workbook, {
      type: 'buffer',
      bookType: 'xlsx',
      cellStyles: true,
    });

    return excelBuffer;
  }

  /**
   * Fetch Companies by IDs
   */
  private async fetchCompaniesByIds(companyIds: number[]): Promise<any[]> {
    const companies = await this.prisma.company.findMany({
      where: { 
        company_id: {
          in: companyIds,
        },
      },
    });

    return companies.map((company) => ({
      'Company Name': company.name,
      'Company Code': company.companyCode,
    }));
  }

  /**
   * Fetch Companies (kept for backward compatibility)
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
        'Company Name': company.name,
        'Company Code': company.companyCode,
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
        Function: true, // Parent function
      },
    });

    return functions.map((func) => ({
      'Function Name': func.name,
      'Function Code': func.functionCode,
      'Background color': func.backgroundColor || '',
      'Company Code': func.company.companyCode,
      'Parent Function Code': func.Function?.functionCode || '',
      'Description': this.truncateText(func.overview),
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
        jobSkills: {
          include: {
            skill: true,
            skill_level: true,
          },
        },
      },
    });

    return jobs.map((job) => {
      // Extract skills and skill ranks
      const skills = job.jobSkills.map(js => js.skill.name).join(', ');
      const skillRanks = job.jobSkills.map(js => js.skill_level.level_rank).join(', ');

      return {
        'Job Name': job.name,
        'Job Code': job.jobCode,
        'Hourly Rate': job.hourlyRate,
        'Max Hours Per Day': job.maxHoursPerDay,
        'Function': job.Function.functionCode,
        'Company Code': job.company.companyCode,
        'Level Rank': job.job_level?.level_rank || 1,
        'Skills': skills,
        'Skill Rank': skillRanks,
        'Job Description': this.truncateText(job.description),
      };
    });
  }

  /**
   * Fetch Tasks
   */
  private async fetchTasks(companyId: number): Promise<any[]> {
    const tasks = await this.prisma.task.findMany({
      where: { task_company_id: companyId },
      include: {
        company: true,
        jobTasks: {
          include: {
            job: true,
          },
        },
        task_skill: {
          include: {
            skill: true,
            skill_level: true,
          },
        },
      },
    });

    return tasks.map((task) => {
      // Extract associated jobs
      const associatedJobs = task.jobTasks.map(jt => jt.job.jobCode).join(', ');
      
      // Extract skills and skill ranks
      const skills = task.task_skill.map(ts => ts.skill.name).join(', ');
      const skillRanks = task.task_skill.map(ts => ts.skill_level.level_rank).join(', ');

      return {
        'Task Name': task.task_name,
        'Task Code': task.task_code,
        'Capacity (minutes)': task.task_capacity_minutes,
        'Company Code': task.company.companyCode,
        'Associated Jobs': associatedJobs,
        'Req Skills': skills,
        'Skill Rank': skillRanks,
        'Task Description': this.truncateText(task.task_overview),
      };
    });
  }

  /**
   * Fetch specific Processes by IDs
   */
  private async fetchProcessesByIds(processIds: number[]): Promise<any[]> {
    const processes = await this.prisma.process.findMany({
      where: { 
        process_id: {
          in: processIds,
        },
      },
      include: {
        company: true,
      },
    });

    return processes.map((process) => ({
      'Process Name': process.process_name,
      'Process Code': process.process_code,
      'Company Code': process.company.companyCode,
      'Process Overview': this.truncateText(process.process_overview),
    }));
  }

  /**
   * Fetch Tasks for specific Processes
   */
  private async fetchTasksForProcesses(processIds: number[]): Promise<any[]> {
    const tasks = await this.prisma.task.findMany({
      where: {
        process_task: {
          some: {
            process_id: {
              in: processIds,
            },
          },
        },
      },
      include: {
        company: true,
        jobTasks: {
          include: {
            job: true,
          },
        },
        task_skill: {
          include: {
            skill: true,
            skill_level: true,
          },
        },
      },
    });

    return tasks.map((task) => {
      // Extract associated jobs
      const associatedJobs = task.jobTasks.map(jt => jt.job.jobCode).join(', ');
      
      // Extract skills and skill ranks
      const skills = task.task_skill.map(ts => ts.skill.name).join(', ');
      const skillRanks = task.task_skill.map(ts => ts.skill_level.level_rank).join(', ');

      return {
        'Task Name': task.task_name,
        'Task Code': task.task_code,
        'Capacity (minutes)': task.task_capacity_minutes,
        'Company Code': task.company.companyCode,
        'Associated Jobs': associatedJobs,
        'Req Skills': skills,
        'Skill Rank': skillRanks,
        'Task Description': this.truncateText(task.task_overview),
      };
    });
  }

  /**
   * Fetch Jobs for specific Processes (jobs linked through tasks)
   */
  private async fetchJobsForProcesses(processIds: number[]): Promise<any[]> {
    const jobs = await this.prisma.job.findMany({
      where: {
        jobTasks: {
          some: {
            task: {
              process_task: {
                some: {
                  process_id: {
                    in: processIds,
                  },
                },
              },
            },
          },
        },
      },
      include: {
        Function: true,
        company: true,
        job_level: true,
        jobSkills: {
          include: {
            skill: true,
            skill_level: true,
          },
        },
      },
    });

    return jobs.map((job) => {
      // Extract skills and skill ranks
      const skills = job.jobSkills.map(js => js.skill.name).join(', ');
      const skillRanks = job.jobSkills.map(js => js.skill_level.level_rank).join(', ');

      return {
        'Job Name': job.name,
        'Job Code': job.jobCode,
        'Hourly Rate': job.hourlyRate,
        'Max Hours Per Day': job.maxHoursPerDay,
        'Function': job.Function.functionCode,
        'Company Code': job.company.companyCode,
        'Level Rank': job.job_level?.level_rank || 1,
        'Skills': skills,
        'Skill Rank': skillRanks,
        'Job Description': this.truncateText(job.description),
      };
    });
  }

  /**
   * Fetch Functions for specific Processes (functions linked through jobs)
   */
  private async fetchFunctionsForProcesses(processIds: number[]): Promise<any[]> {
    const functions = await this.prisma.function.findMany({
      where: {
        job: {
          some: {
            jobTasks: {
              some: {
                task: {
                  process_task: {
                    some: {
                      process_id: {
                        in: processIds,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      include: {
        company: true,
        Function: true, // Parent function
      },
    });

    return functions.map((func) => ({
      'Function Name': func.name,
      'Function Code': func.functionCode,
      'Background color': func.backgroundColor || '',
      'Company Code': func.company.companyCode,
      'Parent Function Code': func.Function?.functionCode || '',
      'Description': this.truncateText(func.overview),
    }));
  }

  /**
   * Fetch People for specific Processes (people assigned to jobs related to these processes)
   */
  private async fetchPeopleForProcesses(processIds: number[]): Promise<any[]> {
    const people = await this.prisma.people.findMany({
      where: {
        job: {
          jobTasks: {
            some: {
              task: {
                process_task: {
                  some: {
                    process_id: {
                      in: processIds,
                    },
                  },
                },
              },
            },
          },
        },
      },
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
      'Company Code': person.company.companyCode,
      'Job Code': person.job?.jobCode || '',
      'Is Manager': person.is_manager ? 'Yes' : 'No',
    }));
  }

  /**
   * Fetch Task-Process relationships for specific Processes
   */
  private async fetchTaskProcessesForProcesses(processIds: number[]): Promise<any[]> {
    const taskProcesses = await this.prisma.process_task.findMany({
      where: {
        process_id: {
          in: processIds,
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
   * Fetch Job-Task relationships for specific Processes
   */
  private async fetchJobTasksForProcesses(processIds: number[]): Promise<any[]> {
    const jobTasks = await this.prisma.job_task.findMany({
      where: {
        task: {
          process_task: {
            some: {
              process_id: {
                in: processIds,
              },
            },
          },
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
   * Fetch Function-Job relationships for specific Processes
   */
  private async fetchFunctionJobsForProcesses(processIds: number[]): Promise<any[]> {
    const jobs = await this.prisma.job.findMany({
      where: {
        jobTasks: {
          some: {
            task: {
              process_task: {
                some: {
                  process_id: {
                    in: processIds,
                  },
                },
              },
            },
          },
        },
      },
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
   * Fetch specific Process by ID (kept for backward compatibility)
   */
  private async fetchProcessById(processId: number): Promise<any[]> {
    const process = await this.prisma.process.findUnique({
      where: { process_id: processId },
      include: {
        company: true,
      },
    });

    if (!process) return [];

    return [
      {
        'Process Name': process.process_name,
        'Process Code': process.process_code,
        'Company Code': process.company.companyCode,
        'Process Overview': this.truncateText(process.process_overview),
      },
    ];
  }

  /**
   * Fetch Tasks for a specific Process
   */
  private async fetchTasksForProcess(processId: number): Promise<any[]> {
    const tasks = await this.prisma.task.findMany({
      where: {
        process_task: {
          some: {
            process_id: processId,
          },
        },
      },
      include: {
        company: true,
        jobTasks: {
          include: {
            job: true,
          },
        },
        task_skill: {
          include: {
            skill: true,
            skill_level: true,
          },
        },
      },
    });

    return tasks.map((task) => {
      // Extract associated jobs
      const associatedJobs = task.jobTasks.map(jt => jt.job.jobCode).join(', ');
      
      // Extract skills and skill ranks
      const skills = task.task_skill.map(ts => ts.skill.name).join(', ');
      const skillRanks = task.task_skill.map(ts => ts.skill_level.level_rank).join(', ');

      return {
        'Task Name': task.task_name,
        'Task Code': task.task_code,
        'Capacity (minutes)': task.task_capacity_minutes,
        'Company Code': task.company.companyCode,
        'Associated Jobs': associatedJobs,
        'Req Skills': skills,
        'Skill Rank': skillRanks,
        'Task Description': this.truncateText(task.task_overview),
      };
    });
  }

  /**
   * Fetch Jobs for a specific Process (jobs linked through tasks)
   */
  private async fetchJobsForProcess(processId: number): Promise<any[]> {
    const jobs = await this.prisma.job.findMany({
      where: {
        jobTasks: {
          some: {
            task: {
              process_task: {
                some: {
                  process_id: processId,
                },
              },
            },
          },
        },
      },
      include: {
        Function: true,
        company: true,
        job_level: true,
        jobSkills: {
          include: {
            skill: true,
            skill_level: true,
          },
        },
      },
    });

    return jobs.map((job) => {
      // Extract skills and skill ranks
      const skills = job.jobSkills.map(js => js.skill.name).join(', ');
      const skillRanks = job.jobSkills.map(js => js.skill_level.level_rank).join(', ');

      return {
        'Job Name': job.name,
        'Job Code': job.jobCode,
        'Hourly Rate': job.hourlyRate,
        'Max Hours Per Day': job.maxHoursPerDay,
        'Function': job.Function.functionCode,
        'Company Code': job.company.companyCode,
        'Level Rank': job.job_level?.level_rank || 1,
        'Skills': skills,
        'Skill Rank': skillRanks,
        'Job Description': this.truncateText(job.description),
      };
    });
  }

  /**
   * Fetch Functions for a specific Process (functions linked through jobs)
   */
  private async fetchFunctionsForProcess(processId: number): Promise<any[]> {
    const functions = await this.prisma.function.findMany({
      where: {
        job: {
          some: {
            jobTasks: {
              some: {
                task: {
                  process_task: {
                    some: {
                      process_id: processId,
                    },
                  },
                },
              },
            },
          },
        },
      },
      include: {
        company: true,
        Function: true, // Parent function
      },
    });

    return functions.map((func) => ({
      'Function Name': func.name,
      'Function Code': func.functionCode,
      'Background color': func.backgroundColor || '',
      'Company Code': func.company.companyCode,
      'Parent Function Code': func.Function?.functionCode || '',
      'Description': this.truncateText(func.overview),
    }));
  }

  /**
   * Fetch People for a specific Process (people assigned to jobs related to this process)
   */
  private async fetchPeopleForProcess(processId: number): Promise<any[]> {
    const people = await this.prisma.people.findMany({
      where: {
        job: {
          jobTasks: {
            some: {
              task: {
                process_task: {
                  some: {
                    process_id: processId,
                  },
                },
              },
            },
          },
        },
      },
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
      'Company Code': person.company.companyCode,
      'Job Code': person.job?.jobCode || '',
      'Is Manager': person.is_manager ? 'Yes' : 'No',
    }));
  }

  /**
   * Fetch Task-Process relationships for specific Process
   */
  private async fetchTaskProcessesForProcess(processId: number): Promise<any[]> {
    const taskProcesses = await this.prisma.process_task.findMany({
      where: {
        process_id: processId,
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
   * Fetch Job-Task relationships for specific Process
   */
  private async fetchJobTasksForProcess(processId: number): Promise<any[]> {
    const jobTasks = await this.prisma.job_task.findMany({
      where: {
        task: {
          process_task: {
            some: {
              process_id: processId,
            },
          },
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
   * Fetch Function-Job relationships for specific Process
   */
  private async fetchFunctionJobsForProcess(processId: number): Promise<any[]> {
    const jobs = await this.prisma.job.findMany({
      where: {
        jobTasks: {
          some: {
            task: {
              process_task: {
                some: {
                  process_id: processId,
                },
              },
            },
          },
        },
      },
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
      'Company Code': process.company.companyCode,
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
      'Company Code': person.company.companyCode,
      'Job Code': person.job?.jobCode || '',
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
   * Helper method to add sheet to workbook with bold headers
   */
  private addSheet(workbook: XLSX.WorkBook, sheetName: string, data: any[]): void {
    const worksheet = XLSX.utils.json_to_sheet(data);
    
    // Make headers bold
    if (worksheet['!ref']) {
      const range = XLSX.utils.decode_range(worksheet['!ref']);
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
        if (worksheet[cellAddress]) {
          if (!worksheet[cellAddress].s) {
            worksheet[cellAddress].s = {};
          }
          worksheet[cellAddress].s = {
            font: { bold: true },
            alignment: { horizontal: 'center', vertical: 'center' }
          };
        }
      }
    }
    
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  }
}
