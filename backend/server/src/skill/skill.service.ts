import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSkillDto } from './dto/create-skill.dto';
import { UpdateSkillDto } from './dto/update-skill.dto';

@Injectable()
export class SkillService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateSkillDto) {
    return this.prisma.skill.create({
      data: {
        name: dto.name,
      },
    });
  }

  async findAll() {
    return this.prisma.skill.findMany();
  }

  async findOne(skill_id: number) {
    const skill = await this.prisma.skill.findUnique({ 
      where: { skill_id } 
    });
    if (!skill) throw new NotFoundException(`Skill ${skill_id} not found`);
    return skill;
  }

  async findAllWithRelations() {
    return this.prisma.skill.findMany({
      include: {
        jobSkills: {
          include: { 
            job: true 
          } 
        },
      },
    });
  }

  async findOneWithRelations(skill_id: number) {
    const skill = await this.prisma.skill.findUnique({
      where: { skill_id },
      include: {
        jobSkills: {
          include: { 
            job: true 
          } 
        },
      },
    });
    if (!skill) throw new NotFoundException(`Skill ${skill_id} not found`);
    return skill;
  }

  async update(skill_id: number, dto: UpdateSkillDto) {
    try {
      return await this.prisma.skill.update({
        where: { skill_id },
        data: {
          name: dto.name,
        },
      });
    } catch (e: any) {
      if (e?.code === 'P2025') throw new NotFoundException(`Skill ${skill_id} not found`);
      throw e;
    }
  }

  async remove(skill_id: number) {
    try {
      return await this.prisma.skill.delete({ 
        where: { skill_id } 
      });
    } catch (e: any) {
      if (e?.code === 'P2025') throw new NotFoundException(`Skill ${skill_id} not found`);
      throw e;
    }
  }
}
