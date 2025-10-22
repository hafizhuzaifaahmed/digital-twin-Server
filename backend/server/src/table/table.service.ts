import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTableDto } from './dto/create-table.dto';
import { UpdateTableDto } from './dto/update-table.dto';
import { AssignJobDto } from './dto/assign-job.dto';

@Injectable()
export class TableService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateTableDto) {
    // Enforce: a room (cell) can have max 2 tables and both must share the same orientation
    const existing = await this.prisma.table.findMany({ where: { room_id: dto.room_id } });
    if (existing.length >= 2) {
      throw new BadRequestException('This cell already has the maximum of 2 tables.');
    }
    let orientationToUse = dto.orientation as any;
    if (existing.length === 1) {
      const existingOrientation = existing[0].orientation;
      if (!orientationToUse) {
        // Default to existing orientation if not provided
        orientationToUse = existingOrientation as any;
      } else if (orientationToUse !== existingOrientation) {
        throw new BadRequestException(`Orientation must match existing table in this cell (${existingOrientation}).`);
      }
    }
    const data: any = {
      tableCode: dto.tableCode,
      name: dto.name,
      room_id: dto.room_id,
      capacity: dto.capacity ?? undefined,
      orientation: orientationToUse ?? undefined,
    };
    return this.prisma.table.create({ data });
  }

  async findAll() {
    return this.prisma.table.findMany();
  }

  async findOne(table_id: number) {
    const table = await this.prisma.table.findUnique({ where: { table_id } });
    if (!table) throw new NotFoundException(`Table ${table_id} not found`);
    return table;
  }

  async findAllWithRelations() {
    return this.prisma.table.findMany({
      include: ({
        room: true,
        table_job: {
          include: {
            job: {
              include: ({
                Function: { include: { other_Function: true, Function: true } },
              } as any),
            },
          },
        },
      } as any),
    });
  }

  async findOneWithRelations(table_id: number) {
    const table = await this.prisma.table.findUnique({
      where: { table_id },
      include: ({
        room: true,
        table_job: {
          include: {
            job: {
              include: ({
                Function: { include: { other_Function: true, Function: true } },
              } as any),
            },
          },
        },
      } as any),
    });
    if (!table) throw new NotFoundException(`Table ${table_id} not found`);
    return table;
  }

  async update(table_id: number, dto: UpdateTableDto) {
    // If capacity is being reduced, ensure it is not below current assignments
    if (dto.capacity !== undefined && dto.capacity !== null) {
      const existing = await this.prisma.table.findUnique({ where: { table_id }, select: { capacity: true } });
      if (!existing) throw new NotFoundException(`Table ${table_id} not found`);
      const assignedCount = await (this.prisma as any).table_job.count({ where: { table_id } });
      if (dto.capacity < assignedCount) {
        throw new BadRequestException(`Cannot reduce capacity below current assigned jobs (${assignedCount}).`);
      }
      if (dto.capacity < 1 || dto.capacity > 6) {
        throw new BadRequestException('Capacity must be between 1 and 6');
      }
    }
    // Enforce orientation and count constraints when changing room or orientation
    let orientationToUse = dto.orientation as any;
    let targetRoomId = dto.room_id;
    const current = await this.prisma.table.findUnique({ where: { table_id } });
    if (!current) throw new NotFoundException(`Table ${table_id} not found`);
    if (targetRoomId === undefined || targetRoomId === null) {
      targetRoomId = current.room_id;
    }
    const siblings = await this.prisma.table.findMany({ where: { room_id: targetRoomId, NOT: { table_id } } });
    if (siblings.length >= 2) {
      throw new BadRequestException('Target cell already has the maximum of 2 tables.');
    }
    if (!orientationToUse) {
      // default to existing orientation if not provided
      orientationToUse = (dto.room_id && targetRoomId !== current.room_id)
        ? (siblings[0]?.orientation ?? current.orientation)
        : current.orientation;
    }
    if (siblings.length === 1) {
      const siblingOrientation = siblings[0].orientation;
      if (orientationToUse !== siblingOrientation) {
        throw new BadRequestException(`Orientation must match existing table in this cell (${siblingOrientation}).`);
      }
    }

    const data: any = {
      tableCode: dto.tableCode ?? undefined,
      name: dto.name ?? undefined,
      room_id: targetRoomId ?? undefined,
      capacity: dto.capacity ?? undefined,
      orientation: orientationToUse ?? undefined,
    };
    try {
      return await this.prisma.table.update({ where: { table_id }, data });
    } catch (e: any) {
      if (e?.code === 'P2025') throw new NotFoundException(`Table ${table_id} not found`);
      throw e;
    }
  }

  async remove(table_id: number) {
    try {
      return await this.prisma.table.delete({ where: { table_id } });
    } catch (e: any) {
      if (e?.code === 'P2025') throw new NotFoundException(`Table ${table_id} not found`);
      throw e;
    }
  }
}

@Injectable()
export class TableAssignmentService {
  constructor(private readonly prisma: PrismaService) {}

  private async ensureTable(table_id: number) {
    const table = await this.prisma.table.findUnique({ where: { table_id } });
    if (!table) throw new NotFoundException(`Table ${table_id} not found`);
    return table;
  }

  private async ensureJob(job_id: number) {
    const job = await this.prisma.job.findUnique({ where: { job_id } });
    if (!job) throw new NotFoundException(`Job ${job_id} not found`);
    return job;
  }

  async listJobs(table_id: number) {
    await this.ensureTable(table_id);
    return (this.prisma as any).table_job.findMany({
      where: { table_id },
      include: ({
        job: {
          include: ({ Function: { include: { other_Function: true, Function: true } } } as any),
        },
      } as any),
    });
  }

  async assignJob(table_id: number, dto: AssignJobDto) {
    const table = await this.ensureTable(table_id);
    await this.ensureJob(dto.job_id);
    const assignedCount = await (this.prisma as any).table_job.count({ where: { table_id } });
    if (assignedCount >= table.capacity) {
      throw new BadRequestException(`Table is at capacity (${table.capacity}).`);
    }
    const exists = await (this.prisma as any).table_job.findUnique({
      where: { table_id_job_id: { table_id, job_id: dto.job_id } },
    });
    if (exists) return exists;
    return (this.prisma as any).table_job.create({
      data: { table_id, job_id: dto.job_id },
      include: ({
        job: { include: ({ Function: { include: { other_Function: true, Function: true } } } as any) },
      } as any),
    });
  }

  async unassignJob(table_id: number, job_id: number) {
    await this.ensureTable(table_id);
    try {
      return await (this.prisma as any).table_job.delete({ where: { table_id_job_id: { table_id, job_id } } });
    } catch (e: any) {
      if (e?.code === 'P2025') throw new NotFoundException(`Assignment not found for table ${table_id} and job ${job_id}`);
      throw e;
    }
  }
}
