import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  ParsedExcelData,
  CompanySheetRow,
  FunctionSheetRow,
  JobSheetRow,
  TaskSheetRow,
  ProcessSheetRow,
  PeopleSheetRow,
  TaskProcessSheetRow,
  JobTaskSheetRow,
} from './dto/sheet-data.dto';
import {
  ImportResponseDto,
  ImportSummary,
  SheetImportDetail,
} from './dto/import-response.dto';

@Injectable()
export class ImportService {
  constructor(private prisma: PrismaService) {}

  /**
   * Main import function - executes bottom-up import in transaction
   */
  async importExcelData(
    parsedData: ParsedExcelData,
    dryRun: boolean = false,
  ): Promise<ImportResponseDto> {
    const response: ImportResponseDto = {
      success: false,
      message: '',
      summary: {
        totalSheets: 0,
        processedSheets: 0,
        totalRecords: 0,
        imported: 0,
        skipped: 0,
        failed: 0,
      },
      details: {},
    };

    try {
      // Execute entire import in a transaction with extended timeout (5 minutes)
      await this.prisma.$transaction(async (tx) => {
        // Phase 1: Import companies first
        response.details['Company'] = await this.importCompanies(
          tx,
          parsedData.companies,
        );

        // Phase 2: Import in bottom-up order (no company filtering)
        response.details['Function'] = await this.importFunctions(
          tx,
          parsedData.functions,
        );

        response.details['Job'] = await this.importJobs(
          tx,
          parsedData.jobs,
        );

        response.details['Task'] = await this.importTasks(
          tx,
          parsedData.tasks,
        );

        response.details['Process'] = await this.importProcesses(
          tx,
          parsedData.processes,
        );

        response.details['Task-Process'] = await this.importTaskProcess(
          tx,
          parsedData.taskProcess,
        );

        response.details['Job-Task'] = await this.importJobTask(
          tx,
          parsedData.jobTask,
        );

        response.details['People'] = await this.importPeople(
          tx,
          parsedData.people,
        );

        // Calculate summary
        response.summary = this.calculateSummary(response.details);

        // If dry run, throw an error to rollback transaction
        if (dryRun) {
          throw new Error('DRY_RUN_ROLLBACK');
        }
      }, {
        maxWait: 300000, // 5 minutes - maximum time to wait for a transaction to start
        timeout: 300000, // 5 minutes - maximum time for the transaction to complete
      });

      response.success = true;
      response.message = dryRun
        ? 'Dry run completed successfully (no data saved)'
        : 'Data imported successfully';
    } catch (error) {
      if (error.message === 'DRY_RUN_ROLLBACK') {
        response.success = true;
        response.message = 'Dry run validation passed (no data saved)';
      } else {
        response.success = false;
        response.message = `Import failed: ${error.message}`;
        
        // Add error to summary if transaction failed
        if (Object.keys(response.details).length === 0) {
          response.details['Error'] = {
            imported: 0,
            skipped: 0,
            failed: 1,
            errors: [{ row: 0, error: error.message }],
          };
        }
      }
    }

    return response;
  }

  /**
   * Ensure company exists or create it (deprecated - no longer used)
   */
  private async ensureCompany(tx: any, companyName: string) {
    let company = await tx.company.findFirst({
      where: { name: companyName },
    });

    if (!company) {
      // Get or create admin user for company creation
      let adminUser = await tx.user.findFirst({
        where: { role: { name: 'ADMIN' } },
      });

      if (!adminUser) {
        // Create admin role if doesn't exist
        let adminRole = await tx.role.findFirst({
          where: { name: 'ADMIN' },
        });

        if (!adminRole) {
          adminRole = await tx.role.create({
            data: {
              name: 'ADMIN',
              description: 'Administrator role',
            },
          });
        }

        // Create default admin user
        adminUser = await tx.user.create({
          data: {
            email: 'admin@system.com',
            password: 'hashed_password', // In production, hash this properly
            name: 'System Admin',
            role_id: adminRole.role_id,
          },
        });
      }

      // Create company
      company = await tx.company.create({
        data: {
          companyCode: `COMP-${Date.now()}`,
          name: companyName,
          created_by: adminUser.user_id,
        },
      });
    }

    return company;
  }

  /**
   * Import Companies
   */
  private async importCompanies(
    tx: any,
    companies: any[],
  ): Promise<SheetImportDetail> {
    const detail: SheetImportDetail = {
      imported: 0,
      skipped: 0,
      failed: 0,
      errors: [],
    };

    for (let i = 0; i < companies.length; i++) {
      const row = companies[i];
      try {
        // Check if company already exists by companyCode
        const existing = await tx.company.findUnique({
          where: { companyCode: row['Company Code'] },
        });

        if (existing) {
          detail.skipped++;
          continue;
        }

        // Get or create admin user for company creation
        let adminUser = await tx.user.findFirst({
          where: { role: { name: 'ADMIN' } },
        });

        if (!adminUser) {
          // Create admin role if doesn't exist
          let adminRole = await tx.role.findFirst({
            where: { name: 'ADMIN' },
          });

          if (!adminRole) {
            adminRole = await tx.role.create({
              data: {
                name: 'ADMIN',
                description: 'Administrator role',
              },
            });
          }

          // Create default admin user
          adminUser = await tx.user.create({
            data: {
              email: 'admin@system.com',
              password: 'hashed_password',
              name: 'System Admin',
              role_id: adminRole.role_id,
            },
          });
        }

        // Create company
        await tx.company.create({
          data: {
            companyCode: row['Company Code'],
            name: row['Company Name'],
            created_by: adminUser.user_id,
          },
        });

        detail.imported++;
      } catch (error) {
        detail.failed++;
        detail.errors.push({
          row: i + 2, // +2 because Excel is 1-indexed and has header row
          error: error.message,
        });
      }
    }

    return detail;
  }

  /**
   * Import Functions
   */
  private async importFunctions(
    tx: any,
    functions: FunctionSheetRow[],
  ): Promise<SheetImportDetail> {
    const detail: SheetImportDetail = {
      imported: 0,
      skipped: 0,
      failed: 0,
      errors: [],
    };

    for (let i = 0; i < functions.length; i++) {
      const row = functions[i];
      try {
        // Check if function already exists
        const existing = await tx.function.findUnique({
          where: { functionCode: row['Function Code'] },
        });

        if (existing) {
          detail.skipped++;
          continue;
        }

        // Get company from the row's Company Code
        const company = await tx.company.findUnique({
          where: { companyCode: row['Company Code'] },
        });

        if (!company) {
          throw new Error(`Company with code "${row['Company Code']}" not found. Please add this company to the Company sheet first.`);
        }

        // Find parent function if specified
        let parentFunctionId = null;
        if (row['Parent Function Code']) {
          const parentFunction = await tx.function.findUnique({
            where: { functionCode: row['Parent Function Code'] },
          });
          if (parentFunction) {
            parentFunctionId = parentFunction.function_id;
          }
        }

        // Create function
        await tx.function.create({
          data: {
            functionCode: row['Function Code'],
            name: row['Function Name'],
            company_id: company.company_id,
            backgroundColor: row['Background color'] || null,
            parent_function_id: parentFunctionId,
            overview: row['Description'] || null,
          },
        });

        detail.imported++;
      } catch (error) {
        detail.failed++;
        detail.errors.push({
          row: i + 2, // +2 because Excel is 1-indexed and has header row
          error: error.message,
        });
      }
    }

    return detail;
  }

  /**
   * Import Jobs
   */
  private async importJobs(
    tx: any,
    jobs: JobSheetRow[],
  ): Promise<SheetImportDetail> {
    const detail: SheetImportDetail = {
      imported: 0,
      skipped: 0,
      failed: 0,
      errors: [],
    };

    for (let i = 0; i < jobs.length; i++) {
      const row = jobs[i];
      try {
        // Check if job already exists
        let job = await tx.job.findUnique({
          where: { jobCode: row['Job Code'] },
          include: {
            jobSkills: true,
          },
        });

        let isNewJob = false;
        
        if (!job) {
          isNewJob = true;
          
          // Get company from the row's Company Code
          const company = await tx.company.findUnique({
            where: { companyCode: row['Company Code'] },
          });

          if (!company) {
            throw new Error(`Company with code "${row['Company Code']}" not found. Please add this company to the Company sheet first.`);
          }
          
          // Find function by name
          const func = await tx.function.findFirst({
            where: { name: row['Function'] },
          });

          if (!func) {
            throw new Error(`Function with name "${row['Function']}" not found. Make sure the Function Name exists in the Function sheet.`);
          }

          // Find or create job level
          const levelRank = parseInt(row['Level Rank']?.toString() || '1');
          let jobLevel = await tx.job_level.findUnique({
            where: { level_rank: levelRank },
          });

          if (!jobLevel) {
            const levelNames = [
              'NOVICE',
              'INTERMEDIATE',
              'PROFICIENT',
              'ADVANCED',
              'EXPERT',
            ];
            const levelName = levelNames[Math.min(levelRank - 1, 4)];

            jobLevel = await tx.job_level.create({
              data: {
                level_name: levelName,
                level_rank: levelRank,
                description: `Level ${levelRank}`,
              },
            });
          }

          // Create job
          job = await tx.job.create({
            data: {
              jobCode: row['Job Code'],
              name: row['Job Name'],
              company_id: company.company_id,
              function_id: func.function_id,
              job_level_id: jobLevel.id,
              hourlyRate: parseFloat(row['Hourly Rate']?.toString() || '0'),
              maxHoursPerDay: parseFloat(
                row['Max Hours Per Day']?.toString() || '8',
              ),
              description: row['Job Description'] || '',
              overview: row['Job Description'] || null,
              updatedAt: new Date(),
            },
            include: {
              jobSkills: true,
            },
          });
        }

        // Handle skills if provided (whether job is new or existing)
        if (row['Skills']) {
          const skills = row['Skills'].split(',').map((s) => s.trim());
          const skillRanks = row['Skill Rank'] ? row['Skill Rank'].toString().split(',').map((s) => parseInt(s.trim())) : [];

          for (let idx = 0; idx < skills.length; idx++) {
            const skillName = skills[idx];
            const skillRank = skillRanks[idx] || skillRanks[0] || 1;
            
            if (skillName) {
              // Find or create skill
              let skill = await tx.skill.findUnique({
                where: { name: skillName },
              });

              if (!skill) {
                skill = await tx.skill.create({
                  data: { name: skillName },
                });
              }

              // Check if this job-skill relationship already exists
              const existingJobSkill = await tx.job_skill.findUnique({
                where: {
                  job_id_skill_id: {
                    job_id: job.job_id,
                    skill_id: skill.skill_id,
                  },
                },
              });

              if (!existingJobSkill) {
                // Find or create skill level
                let skillLevel = await tx.skill_level.findUnique({
                  where: { level_rank: skillRank },
                });

                if (!skillLevel) {
                  const levelNames = [
                    'NOVICE',
                    'INTERMEDIATE',
                    'PROFICIENT',
                    'ADVANCED',
                    'EXPERT',
                  ];
                  const levelName = levelNames[Math.min(skillRank - 1, 4)];

                  skillLevel = await tx.skill_level.create({
                    data: {
                      level_name: levelName,
                      level_rank: skillRank,
                      description: `Skill level ${skillRank}`,
                    },
                  });
                }

                // Create job_skill relationship
                await tx.job_skill.create({
                  data: {
                    job_id: job.job_id,
                    skill_id: skill.skill_id,
                    skill_level_id: skillLevel.id,
                  },
                });
              }
            }
          }
        }

        if (isNewJob) {
          detail.imported++;
        } else {
          detail.skipped++;
        }
      } catch (error) {
        detail.failed++;
        detail.errors.push({
          row: i + 2,
          error: error.message,
        });
      }
    }

    return detail;
  }

  /**
   * Import Tasks
   */
  private async importTasks(
    tx: any,
    tasks: TaskSheetRow[],
  ): Promise<SheetImportDetail> {
    const detail: SheetImportDetail = {
      imported: 0,
      skipped: 0,
      failed: 0,
      errors: [],
    };

    for (let i = 0; i < tasks.length; i++) {
      const row = tasks[i];
      try {
        // Check if task already exists
        let task = await tx.task.findUnique({
          where: { task_code: row['Task Code'] },
          include: {
            task_skill: true,
          },
        });

        let isNewTask = false;

        if (!task) {
          isNewTask = true;
          
          // Get company from the row's Company Code
          const company = await tx.company.findUnique({
            where: { companyCode: row['Company Code'] },
          });

          if (!company) {
            throw new Error(`Task "${row['Task Code']}": Company with code "${row['Company Code']}" not found in database. Please add a company with this exact code to the Company sheet first.`);
          }
          
          // Create task
          task = await tx.task.create({
            data: {
              task_code: row['Task Code'],
              task_name: row['Task Name'],
              task_company_id: company.company_id,
              task_capacity_minutes: parseInt(
                row['Capacity (minutes)']?.toString() || '0',
              ),
              task_overview: row['Task Description'] || '',
            },
            include: {
              task_skill: true,
            },
          });
        }

        // Handle skills if provided (whether task is new or existing)
        if (row['Req Skills']) {
          const skills = row['Req Skills'].split(',').map((s) => s.trim());
          const skillRanks = row['Skill Rank'] ? row['Skill Rank'].toString().split(',').map((s) => parseInt(s.trim())) : [];

          for (let idx = 0; idx < skills.length; idx++) {
            const skillName = skills[idx];
            const skillRank = skillRanks[idx] || skillRanks[0] || 1;
            
            if (skillName) {
              // Find or create skill
              let skill = await tx.skill.findUnique({
                where: { name: skillName },
              });

              if (!skill) {
                skill = await tx.skill.create({
                  data: { name: skillName },
                });
              }

              // Check if this task-skill relationship already exists
              const existingTaskSkill = await tx.task_skill.findUnique({
                where: {
                  task_skill_task_id_task_skill_skill_id: {
                    task_skill_task_id: task.task_id,
                    task_skill_skill_id: skill.skill_id,
                  },
                },
              });

              if (!existingTaskSkill) {
                // Find or create skill level
                let skillLevel = await tx.skill_level.findUnique({
                  where: { level_rank: skillRank },
                });

                if (!skillLevel) {
                  const levelNames = [
                    'NOVICE',
                    'INTERMEDIATE',
                    'PROFICIENT',
                    'ADVANCED',
                    'EXPERT',
                  ];
                  const levelName = levelNames[Math.min(skillRank - 1, 4)];

                  skillLevel = await tx.skill_level.create({
                    data: {
                      level_name: levelName,
                      level_rank: skillRank,
                      description: `Skill level ${skillRank}`,
                    },
                  });
                }

                // Create task_skill relationship
                await tx.task_skill.create({
                  data: {
                    task_skill_task_id: task.task_id,
                    task_skill_skill_id: skill.skill_id,
                    task_skill_level_id: skillLevel.id,
                    skill_name: skillName,
                  },
                });
              }
            }
          }
        }

        if (isNewTask) {
          detail.imported++;
        } else {
          detail.skipped++;
        }
      } catch (error) {
        detail.failed++;
        detail.errors.push({
          row: i + 2,
          error: error.message,
        });
      }
    }

    return detail;
  }

  /**
   * Import Processes
   */
  private async importProcesses(
    tx: any,
    processes: ProcessSheetRow[],
  ): Promise<SheetImportDetail> {
    const detail: SheetImportDetail = {
      imported: 0,
      skipped: 0,
      failed: 0,
      errors: [],
    };

    for (let i = 0; i < processes.length; i++) {
      const row = processes[i];
      try {
        // Check if process already exists
        const existing = await tx.process.findUnique({
          where: { process_code: row['Process Code'] },
        });

        if (existing) {
          detail.skipped++;
          continue;
        }

        // Get company from the row's Company Code
        const company = await tx.company.findUnique({
          where: { companyCode: row['Company Code'] },
        });

        if (!company) {
          throw new Error(`Company with code "${row['Company Code']}" not found. Please add this company to the Company sheet first.`);
        }

        // Create process
        await tx.process.create({
          data: {
            process_code: row['Process Code'],
            process_name: row['Process Name'],
            company_id: company.company_id,
            process_overview: row['Process Overview'] || '',
          },
        });

        detail.imported++;
      } catch (error) {
        detail.failed++;
        detail.errors.push({
          row: i + 2,
          error: error.message,
        });
      }
    }

    return detail;
  }

  /**
   * Import Task-Process relationships
   */
  private async importTaskProcess(
    tx: any,
    taskProcesses: TaskProcessSheetRow[],
  ): Promise<SheetImportDetail> {
    const detail: SheetImportDetail = {
      imported: 0,
      skipped: 0,
      failed: 0,
      errors: [],
    };

    for (let i = 0; i < taskProcesses.length; i++) {
      const row = taskProcesses[i];
      try {
        // Find task - use transaction to find records created in this transaction
        const task = await tx.task.findUnique({
          where: { task_code: row['TaskCode'] },
        });

        if (!task) {
          console.warn(`Task "${row['TaskCode']}" not found - skipping relationship`);
          detail.skipped++;
          continue;
        }

        // Find process - use transaction
        const process = await tx.process.findUnique({
          where: { process_code: row['ProcessCode'] },
        });

        if (!process) {
          console.warn(`Process "${row['ProcessCode']}" not found - skipping relationship`);
          detail.skipped++;
          continue;
        }

        // Check if relationship already exists
        const existing = await tx.process_task.findUnique({
          where: {
            process_id_task_id: {
              process_id: process.process_id,
              task_id: task.task_id,
            },
          },
        });

        if (existing) {
          detail.skipped++;
          continue;
        }

        // Create relationship
        await tx.process_task.create({
          data: {
            process_id: process.process_id,
            task_id: task.task_id,
            order: parseInt(row['Order']?.toString() || '0'),
          },
        });

        detail.imported++;
      } catch (error) {
        detail.failed++;
        detail.errors.push({
          row: i + 2,
          error: error.message,
        });
      }
    }

    return detail;
  }

  /**
   * Import Job-Task relationships
   */
  private async importJobTask(
    tx: any,
    jobTasks: JobTaskSheetRow[],
  ): Promise<SheetImportDetail> {
    const detail: SheetImportDetail = {
      imported: 0,
      skipped: 0,
      failed: 0,
      errors: [],
    };

    for (let i = 0; i < jobTasks.length; i++) {
      const row = jobTasks[i];
      try {
        // Skip rows with empty TaskCode or JobCode
        if (!row['TaskCode'] || row['TaskCode'].trim() === '' || 
            !row['JobCode'] || row['JobCode'].trim() === '') {
          detail.skipped++;
          continue;
        }

        // Find job - use transaction to find records created in this transaction
        const job = await tx.job.findUnique({
          where: { jobCode: row['JobCode'] },
        });

        if (!job) {
          console.warn(`Job "${row['JobCode']}" not found - skipping relationship`);
          detail.skipped++;
          continue;
        }

        // Find task - use transaction
        const task = await tx.task.findUnique({
          where: { task_code: row['TaskCode'] },
        });

        if (!task) {
          console.warn(`Task "${row['TaskCode']}" not found - skipping relationship`);
          detail.skipped++;
          continue;
        }

        // Check if relationship already exists
        const existing = await tx.job_task.findUnique({
          where: {
            job_id_task_id: {
              job_id: job.job_id,
              task_id: task.task_id,
            },
          },
        });

        if (existing) {
          detail.skipped++;
          continue;
        }

        // Create relationship
        await tx.job_task.create({
          data: {
            job_id: job.job_id,
            task_id: task.task_id,
          },
        });

        detail.imported++;
      } catch (error) {
        detail.failed++;
        detail.errors.push({
          row: i + 2,
          error: error.message,
        });
      }
    }

    return detail;
  }

  /**
   * Import People
   */
  private async importPeople(
    tx: any,
    people: PeopleSheetRow[],
  ): Promise<SheetImportDetail> {
    const detail: SheetImportDetail = {
      imported: 0,
      skipped: 0,
      failed: 0,
      errors: [],
    };

    for (let i = 0; i < people.length; i++) {
      const row = people[i];
      try {
        // Check if person already exists by email OR phone
        let existing = null;
        
        // First check by email
        if (row['Email']) {
          existing = await tx.people.findUnique({
            where: { people_email: row['Email'] },
          });
        }
        
        // If not found by email and phone is provided, check by phone
        if (!existing && row['Phone']) {
          existing = await tx.people.findFirst({
            where: { people_phone: row['Phone'] },
          });
        }

        if (existing) {
          detail.skipped++;
          continue;
        }

        // Get company from the row's Company Code
        const company = await tx.company.findUnique({
          where: { companyCode: row['Company Code'] },
        });

        if (!company) {
          throw new Error(`Company with code "${row['Company Code']}" not found. Please add this company to the Company sheet first.`);
        }

        // Find job by job code only
        const job = await tx.job.findUnique({
          where: { jobCode: row['Job Code'] },
        });

        if (!job) {
          throw new Error(`Job with code "${row['Job Code']}" not found. Make sure the Job Code exists in the Job sheet.`);
        }

        // Create person
        await tx.people.create({
          data: {
            people_name: row['First Name'],
            people_surname: row['Surname'],
            people_email: row['Email'],
            people_phone: row['Phone'] || null,
            company_id: company.company_id,
            job_id: job.job_id,
            is_manager:
              row['Is Manager']?.toLowerCase() === 'yes' ||
              row['Is Manager']?.toLowerCase() === 'true',
          },
        });

        detail.imported++;
      } catch (error) {
        detail.failed++;
        detail.errors.push({
          row: i + 2,
          error: error.message,
        });
      }
    }

    return detail;
  }

  /**
   * Calculate summary from all sheet details
   */
  private calculateSummary(
    details: Record<string, SheetImportDetail>,
  ): ImportSummary {
    const summary: ImportSummary = {
      totalSheets: Object.keys(details).length,
      processedSheets: Object.keys(details).length,
      totalRecords: 0,
      imported: 0,
      skipped: 0,
      failed: 0,
    };

    for (const detail of Object.values(details)) {
      summary.imported += detail.imported;
      summary.skipped += detail.skipped;
      summary.failed += detail.failed;
      summary.totalRecords += detail.imported + detail.skipped + detail.failed;
    }

    return summary;
  }
}
