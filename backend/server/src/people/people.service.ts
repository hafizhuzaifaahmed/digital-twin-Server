import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePeopleDto } from './dto/create-people.dto';
import { UpdatePeopleDto } from './dto/update-people.dto';

@Injectable()
export class PeopleService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreatePeopleDto) {
    // Check if job exists and belongs to the same company
    const job = await this.prisma.job.findUnique({
      where: { job_id: dto.job_id },
      select: { company_id: true }
    });

    if (!job) {
      throw new NotFoundException(`Job with ID ${dto.job_id} not found`);
    }

    if (job.company_id !== dto.company_id) {
      throw new BadRequestException('Job does not belong to the specified company');
    }

    const peopleData: Prisma.peopleCreateInput = {
      people_name: dto.name,
      people_surname: dto.surname,
      company: { connect: { company_id: dto.company_id } },
      job: { connect: { job_id: dto.job_id } },
      is_manager: dto.is_manager ?? false,
      people_email: dto.email,
      people_phone: dto.phone ?? null,
    };

    return this.prisma.people.create({
      data: peopleData,
      include: {
        company: true,
        job: true,
      },
    });
  }

  async findAll() {
    return this.prisma.people.findMany({
      include: {
        company: true,
        job: true,
      },
    });
  }

  async findOne(people_id: number) {
    const people = await this.prisma.people.findUnique({
      where: { people_id },
      include: {
        company: true,
        job: true,
      },
    });
    if (!people) throw new NotFoundException(`People with ID ${people_id} not found`);
    return people;
  }

  async findByEmail(peopleEmail: string) {
    const people = await this.prisma.people.findFirst({
      where: { people_email: peopleEmail },
      include: {
        company: true,
        job: true,
      },
    });
    if (!people) throw new NotFoundException(`People with email ${peopleEmail} not found`);
    return people;
  }

  async update(people_id: number, dto: UpdatePeopleDto) {
    const existing = await this.prisma.people.findUnique({
      where: { people_id },
      include: { 
        company: true,
        job: true
      }
    });
    
    if (!existing) {
      throw new NotFoundException(`People with ID ${people_id} not found`);
    }

    // If updating job_id, verify the job exists and belongs to the same company
    if (dto.job_id && dto.job_id !== existing.job?.job_id) {
      const job = await this.prisma.job.findUnique({
        where: { job_id: dto.job_id },
        select: { company_id: true }
      });

      if (!job) {
        throw new NotFoundException(`Job with ID ${dto.job_id} not found`);
      }

      if (job.company_id !== existing.company_id) {
        throw new BadRequestException('Cannot assign person to a job in a different company');
      }
    }

    const updateData: Prisma.peopleUpdateInput = {};
    
    if (dto.name !== undefined) updateData.people_name = dto.name;
    if (dto.surname !== undefined) updateData.people_surname = dto.surname;
    if (dto.job_id !== undefined) updateData.job = { connect: { job_id: dto.job_id } };
    if (dto.is_manager !== undefined) updateData.is_manager = dto.is_manager;
    if (dto.email !== undefined) updateData.people_email = dto.email;
    if (dto.phone !== undefined) updateData.people_phone = dto.phone;

    return this.prisma.people.update({
      where: { people_id },
      data: updateData,
      include: {
        company: true,
        job: true,
      },
    });
  }

  async remove(people_id: number) {
    try {
      await this.findOne(people_id);
      return await this.prisma.people.delete({ 
        where: { people_id },
        include: {
          company: true,
          job: true,
        },
      });
    } catch (e: any) {
      if (e?.code === 'P2025') throw new NotFoundException(`People with ID ${people_id} not found`);
      throw e;
    }
  }

  async findPeopleByJobId(job_id: number) {
    return this.prisma.people.findMany({
      where: { 
        job_id: job_id
      },
      include: {
        company: true,
        job: true,
      },
      orderBy: [
        { is_manager: 'desc' },
        { people_surname: 'asc' },
        { people_name: 'asc' }
      ]
    });
  }

  async findByCode(email: string) {
    const person = await this.prisma.people.findFirst({
      where: { people_email: email },
      include: {
        company: true,
        job: true,
      },
    });
    if (!person) throw new NotFoundException(`Person with email ${email} not found`);
    return person;
  }

  async findAllWithRelations() {
    return this.prisma.people.findMany({
      include: {
        company: true,
        job: true,
      },
      orderBy: [
        { is_manager: 'desc' },
        { people_surname: 'asc' },
        { people_name: 'asc' }
      ]
    });
  }

  async findOneWithRelations(people_id: number) {
    const person = await this.prisma.people.findUnique({
      where: { people_id },
      include: {
        company: true,
        job: {
          include: {
            job_level: true,
            Function: true,
          }
        },
      },
    });
    if (!person) throw new NotFoundException(`Person with ID ${people_id} not found`);
    return person;
  }
}
