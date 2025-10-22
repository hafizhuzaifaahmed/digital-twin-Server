import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFloorDto } from './dto/create-floor.dto';
import { UpdateFloorDto } from './dto/update-floor.dto';

@Injectable()
export class FloorService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateFloorDto) {
    return this.prisma.executeWithRetry(async (client) => {
      return client.$transaction(async (tx) => {
      // Get building to inherit rows/columns and layout
      const building = await tx.building.findUnique({
        where: { building_id: dto.building_id },
        include: { building_cell: true },
      });
      if (!building) throw new NotFoundException(`Building ${dto.building_id} not found`);

      // Create floor
      const floor = await tx.floor.create({
        data: {
          floorCode: dto.floorCode,
          name: dto.name,
          building_id: dto.building_id,
        },
      });

      // Generate rooms grid for this floor based on building rows/columns
      const rows = building.rows ?? 1;
      const columns = building.columns ?? 1;
      if (building.building_cell.length > 0) {
        const cells = building.building_cell ?? [];
        const roomData = [] as Array<{ floor_id: number; roomCode: string; name: string; row: number; column: number; cellType: any }>;
        for (let r = 1; r <= rows; r++) {
          for (let c = 1; c <= columns; c++) {
            const cell = cells.find((x) => x.row === r && x.column === c);
            roomData.push({
              floor_id: floor.floor_id,
              roomCode: `${dto.floorCode}-${r}-${c}`,
              name: `Room ${r}-${c}`,
              row: r,
              column: c,
              cellType: (cell?.type as any) ?? 'EMPTY',
            });
          }
        }
        if (roomData.length) {
          await tx.room.createMany({ data: roomData });
        }
      }
      return tx.floor.findUnique({ where: { floor_id: floor.floor_id }, include: { room: true } });
      });
    });
  }

  async findAll() {
    return this.prisma.floor.findMany();
  }

  async findOne(floor_id: number) {
    const floor = await this.prisma.floor.findUnique({ where: { floor_id } });
    if (!floor) throw new NotFoundException(`Floor ${floor_id} not found`);
    return floor;
  }

  async findAllWithRelations() {
    return this.prisma.floor.findMany({
      include: ({
        building: true,
        room: {
          include: {
            table: ({
              include: {
                table_job: {
                  include: {
                    job: {
                      include: ({
                        Function: { include: { other_Function: true, Function: true } },
                      } as any),
                    },
                  },
                },
              },
            } as any),
          },
        },
      } as any),
    });
  }

  async findOneWithRelations(floor_id: number) {
    const floor = await this.prisma.floor.findUnique({
      where: { floor_id },
      include: ({
        building: true,
        room: {
          include: {
            table: ({
              include: {
                table_job: {
                  include: {
                    job: {
                      include: ({
                        Function: { include: { other_Function: true, Function: true } },
                      } as any),
                    },
                  },
                },
              },
            } as any),
          },
        },
      } as any),
    });
    if (!floor) throw new NotFoundException(`Floor ${floor_id} not found`);
    return floor;
  }

  async update(floor_id: number, dto: UpdateFloorDto) {
    try {
      return await this.prisma.executeWithRetry(async (client) => {
        return client.$transaction(async (tx) => {
        const current = await tx.floor.findUnique({ where: { floor_id } });
        if (!current) throw new NotFoundException(`Floor ${floor_id} not found`);

        // Update basic fields
        const updated = await tx.floor.update({
          where: { floor_id },
          data: {
            floorCode: dto.floorCode ?? undefined,
            name: dto.name ?? undefined,
            building_id: dto.building_id ?? undefined,
          },
        });

        // If building changed, regenerate rooms to match new building grid
        if (dto.building_id && dto.building_id !== current.building_id) {
          const building = await tx.building.findUnique({ where: { building_id: dto.building_id }, include: { building_cell: true } });
          if (!building) throw new NotFoundException(`Building ${dto.building_id} not found`);

          await tx.room.deleteMany({ where: { floor_id } });

          const rows = building.rows ?? 1;
          const columns = building.columns ?? 1;
          const cells = building.building_cell ?? [];
          const roomData = [] as Array<{ floor_id: number; roomCode: string; name: string; row: number; column: number; cellType: any }>;
          const baseCode = dto.floorCode ?? updated.floorCode;
          for (let r = 1; r <= rows; r++) {
            for (let c = 1; c <= columns; c++) {
              const cell = cells.find((x) => x.row === r && x.column === c);
              roomData.push({
                floor_id,
                roomCode: `${baseCode}-${r}-${c}`,
                name: `Room ${r}-${c}`,
                row: r,
                column: c,
                cellType: (cell?.type as any) ?? 'EMPTY',
              });
            }
          }
          if (roomData.length) await tx.room.createMany({ data: roomData });
        }

        return await tx.floor.findUnique({
          where: { floor_id },
          include: ({
            room: {
              include: {
                table: ({
                  include: {
                    table_job: {
                      include: {
                        job: {
                          include: ({
                            Function: { include: { other_Function: true, Function: true } },
                          } as any),
                        },
                      },
                    },
                  },
                } as any),
              },
            },
          } as any),
        });
        });
      });
    } catch (e: any) {
      if (e?.code === 'P2025') throw new NotFoundException(`Floor ${floor_id} not found`);
      throw e;
    }
  }

  async remove(floor_id: number) {
    try {
      return await this.prisma.floor.delete({ where: { floor_id } });
    } catch (e: any) {
      if (e?.code === 'P2025') throw new NotFoundException(`Floor ${floor_id} not found`);
      throw e;
    }
  }
}
