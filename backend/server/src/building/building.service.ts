import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBuildingDto } from './dto/create-building.dto';
import { UpdateBuildingDto } from './dto/update-building.dto';

@Injectable()
export class BuildingService {
  constructor(private readonly prisma: PrismaService) { }

  async create(dto: CreateBuildingDto) {
    const data: any = {
      buildingCode: dto.buildingCode,
      name: dto.name ?? undefined,
      company_id: dto.company_id ?? undefined,
      rows: dto.rows ?? undefined,
      columns: dto.columns ?? undefined,
      country: dto.country ?? undefined,
      city: dto.city ?? undefined,
    };
    try {
      const rows = dto.rows ?? 1;
      const columns = dto.columns ?? 1;

      // Validate layout bounds (1-based indices) and duplicates per cell
      if (dto.layout?.length) {
        const seen = new Set<string>();
        for (const cell of dto.layout) {
          if (cell.row < 1 || cell.row > rows || cell.column < 1 || cell.column > columns) {
            throw new BadRequestException(`Cell out of bounds: row ${cell.row}, column ${cell.column} (rows=${rows}, columns=${columns})`);
          }
          const key = `${cell.row}-${cell.column}`;
          if (seen.has(key)) {
            throw new BadRequestException(`Duplicate cell specified in layout at row ${cell.row}, column ${cell.column}`);
          }
          seen.add(key);
        }
      }

      return await this.prisma.executeWithRetry(async (client) => {
        return client.$transaction(async (tx) => {
          const building = await tx.building.create({ data });
          if (dto.layout?.length) {
            await tx.building_cell.createMany({
              data: dto.layout.map((c) => ({
                building_id: building.building_id,
                row: c.row,
                column: c.column,
                type: c.type as any,
              })),
              skipDuplicates: true,
            });
          }
          // Return building including cells
          return await tx.building.findUnique({
            where: { building_id: building.building_id },
            include: { building_cell: true },
          });
        });
      });
    } catch (e: any) {
      if (e?.code === 'P2002') throw new ConflictException('buildingCode already exists');
      throw e;
    }
  }

  async findAll() {
    return this.prisma.building.findMany();
  }

  async findOne(building_id: number) {
    const building = await this.prisma.building.findUnique({ where: { building_id } });
    if (!building) throw new NotFoundException(`Building ${building_id} not found`);
    return building;
  }

  async findByCompany(company_id: number) {
    return this.prisma.building.findMany({
      where: { company_id },
    });
  }

  async findAllWithRelations() {
    return this.prisma.building.findMany({
      include: {
        company: true,
        floor: {
          include: {
            room: {
              include: {
                table: true
              },
            },
          },
        },
        building_cell: true,
        // Note: Building doesn't have a direct relation to Renamedfunction or process in the schema
        // These relations should be queried through their respective services
      },
    });
  }

  async findOneWithRelations(building_id: number) {
    const building = await this.prisma.building.findUnique({
      where: { building_id },
      include: {
        company: true,
        floor: {
          include: {
            room: {
              include: {
                table: true
              }
            }
          }
        },
        building_cell: true,
      },
    });
    if (!building) throw new NotFoundException(`Building ${building_id} not found`);
    return building;
  }

  async update(building_id: number, dto: UpdateBuildingDto) {
    const data: any = {
      buildingCode: dto.buildingCode ?? undefined,
      name: dto.name ?? undefined,
      company_id: dto.company_id ?? undefined,
      rows: dto.rows ?? undefined,
      columns: dto.columns ?? undefined,
      country: dto.country ?? undefined,
      city: dto.city ?? undefined,
    };
    try {
      // Get current to compute bounds with potential new rows/columns
      const current = await this.prisma.building.findUnique({ where: { building_id } });
      if (!current) throw new NotFoundException(`Building ${building_id} not found`);
      const newRows = dto.rows ?? current.rows ?? 1;
      const newColumns = dto.columns ?? current.columns ?? 1;

      if (dto.layout?.length) {
        const seen = new Set<string>();
        for (const cell of dto.layout) {
          if (cell.row < 1 || cell.row > newRows || cell.column < 1 || cell.column > newColumns) {
            throw new BadRequestException(`Cell out of bounds: row ${cell.row}, column ${cell.column} (rows=${newRows}, columns=${newColumns})`);
          }
          const key = `${cell.row}-${cell.column}`;
          if (seen.has(key)) {
            throw new BadRequestException(`Duplicate cell specified in layout at row ${cell.row}, column ${cell.column}`);
          }
          seen.add(key);
        }
      }

      return await this.prisma.executeWithRetry(async (client) => {
        return client.$transaction(async (tx) => {
          await tx.building.update({ where: { building_id }, data });
          if (dto.layout) {
            await tx.building_cell.deleteMany({ where: { building_id } });
            if (dto.layout.length) {
              await tx.building_cell.createMany({
                data: dto.layout.map((c) => ({
                  building_id,
                  row: c.row,
                  column: c.column,
                  type: c.type as any,
                })),
                skipDuplicates: true,
              });
            }
          }
          // Return updated building including cells
          return await tx.building.findUnique({
            where: { building_id },
            include: { building_cell: true },
          });
        });
      });
    } catch (e: any) {
      if (e?.code === 'P2025') throw new NotFoundException(`Building ${building_id} not found`);
      if (e?.code === 'P2002') throw new ConflictException('buildingCode already exists');
      throw e;
    }
  }

  async remove(building_id: number) {
    try {
      // With schema-level onDelete: Cascade, a single delete suffices
      // Ensure existence for a clean 404
      const existing = await this.prisma.building.findUnique({ where: { building_id } });
      if (!existing) throw new NotFoundException(`Building ${building_id} not found`);
      return await this.prisma.building.delete({ where: { building_id } });
    } catch (e: any) {
      if (e?.code === 'P2025') throw new NotFoundException(`Building ${building_id} not found`);
      // If cascades aren't migrated yet, P2003 may still occur. Fallback to manual cascade delete.
      if (e?.code === 'P2003') {
        return await this.prisma.$transaction(async (tx) => {
          const b = await tx.building.findUnique({ where: { building_id } });
          if (!b) throw new NotFoundException(`Building ${building_id} not found`);

          const floors = await tx.floor.findMany({ where: { building_id }, select: { floor_id: true } });
          const floorIds = floors.map((f) => f.floor_id);
          if (floorIds.length) {
            const rooms = await tx.room.findMany({ where: { floor_id: { in: floorIds } }, select: { room_id: true } });
            const roomIds = rooms.map((r) => r.room_id);
            if (roomIds.length) {
              await tx.table.deleteMany({ where: { room_id: { in: roomIds } } });
              await tx.room.deleteMany({ where: { room_id: { in: roomIds } } });
            }
            await tx.floor.deleteMany({ where: { floor_id: { in: floorIds } } });
          }

          await tx.building_cell.deleteMany({ where: { building_id } });
          return await tx.building.delete({ where: { building_id } });
        });
      }
      throw e;
    }
  }
}
