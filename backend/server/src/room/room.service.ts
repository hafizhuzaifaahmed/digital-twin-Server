import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';

@Injectable()
export class RoomService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateRoomDto) {
    if (dto.row == null || dto.column == null) {
      throw new BadRequestException('row and column are required for room creation');
    }
    // Load grid bounds from floor -> building
    const floor = await this.prisma.floor.findUnique({
      where: { floor_id: dto.floor_id },
      include: { building: true },
    });
    if (!floor) throw new NotFoundException(`Floor ${dto.floor_id} not found`);
    const rows = floor.building.rows ?? 1;
    const columns = floor.building.columns ?? 1;
    if (dto.row < 1 || dto.row > rows || dto.column < 1 || dto.column > columns) {
      throw new BadRequestException(`Cell out of bounds: row ${dto.row}, column ${dto.column} (rows=${rows}, columns=${columns})`);
    }
    // Uniqueness pre-check for clarity (DB also enforces)
    const existing = await this.prisma.room.findFirst({
      where: { floor_id: dto.floor_id, row: dto.row, column: dto.column },
    });
    if (existing) {
      throw new ConflictException(`Room already exists at (row=${dto.row}, column=${dto.column}) on this floor`);
    }
    return this.prisma.room.create({
      data: {
        roomCode: dto.roomCode,
        name: dto.name,
        floor_id: dto.floor_id,
        row: dto.row,
        column: dto.column,
        cellType: (dto.cellType as any) ?? undefined,
      },
    });
  }

  async findAll() {
    return this.prisma.room.findMany();
  }

  async findOne(room_id: number) {
    const room = await this.prisma.room.findUnique({ 
      where: { room_id } 
    });
    if (!room) throw new NotFoundException(`Room ${room_id} not found`);
    return room;
  }

  async findAllWithRelations() {
    return this.prisma.room.findMany({
      include: {
        floor: true,
        table: true,
      },
    });
  }

  async findOneWithRelations(room_id: number) {
    const room = await this.prisma.room.findUnique({
      where: { room_id },
      include: {
        floor: true,
        table: true,
      },
    });
    if (!room) throw new NotFoundException(`Room ${room_id} not found`);
    return room;
  }

  async update(room_id: number, dto: UpdateRoomDto) {
    try {
      // Load current state
      const current = await this.prisma.room.findUnique({ where: { room_id } });
      if (!current) throw new NotFoundException(`Room ${room_id} not found`);
      const targetFloorId = dto.floor_id ?? current.floor_id;
      const targetRow = dto.row ?? current.row;
      const targetColumn = dto.column ?? current.column;
      // Load grid bounds from target floor -> building
      const floor = await this.prisma.floor.findUnique({
        where: { floor_id: targetFloorId },
        include: { building: true },
      });
      if (!floor) throw new NotFoundException(`Floor ${targetFloorId} not found`);
      const rows = floor.building.rows ?? 1;
      const columns = floor.building.columns ?? 1;
      if (targetRow < 1 || targetRow > rows || targetColumn < 1 || targetColumn > columns) {
        throw new BadRequestException(`Cell out of bounds: row ${targetRow}, column ${targetColumn} (rows=${rows}, columns=${columns})`);
      }
      // Uniqueness pre-check excluding self
      const conflict = await this.prisma.room.findFirst({
        where: {
          floor_id: targetFloorId,
          row: targetRow,
          column: targetColumn,
          NOT: { room_id },
        },
      });
      if (conflict) {
        throw new ConflictException(`Another room already exists at (row=${targetRow}, column=${targetColumn}) on this floor`);
      }
      return await this.prisma.room.update({
        where: { room_id },
        data: {
          roomCode: dto.roomCode ?? undefined,
          name: dto.name ?? undefined,
          floor_id: dto.floor_id ?? undefined,
          row: dto.row ?? undefined,
          column: dto.column ?? undefined,
          cellType: (dto.cellType as any) ?? undefined,
        },
      });
    } catch (e: any) {
      if (e?.code === 'P2025') throw new NotFoundException(`Room ${room_id} not found`);
      throw e;
    }
  }

  async remove(room_id: number) {
    try {
      return await this.prisma.room.delete({ 
        where: { room_id } 
      });
    } catch (e: any) {
      if (e?.code === 'P2025') throw new NotFoundException(`Room ${room_id} not found`);
      throw e;
    }
  }
}
