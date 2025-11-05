import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';

@Injectable()
export class CompanyService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCompanyDto) {
    const data = {
      companyCode: dto.companyCode,
      name: dto.name,
      created_by: dto.created_by,
      org_type_id: dto.org_type_id ?? 1, // Default to Functional (ID: 1)
    };
    return this.prisma.company.create({
      data,
      include: { organizationType: true },
    });
  }

  async findAll() {
    return this.prisma.company.findMany({
      include: { organizationType: true },
    });
  }

  async findOne(company_id: number) {
    const company = await this.prisma.company.findUnique({
      where: { company_id },
      include: { organizationType: true },
    });
    if (!company) throw new NotFoundException(`Company ${company_id} not found`);
    return company;
  }

  async findAllWithRelations() {
    return this.prisma.company.findMany({
      include: {
        organizationType: true,
        people: true,
        buildings: {
          include: {
            floor: {
              include: {
                room: {
                  include: {
                    table: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  async findOneWithRelations(company_id: number) {
    const company = await this.prisma.company.findUnique({
      where: { company_id },
      include: {
        organizationType: true,
        people: true,
        buildings: {
          include: {
            floor: {
              include: {
                room: {
                  include: {
                    table: true,
                  },
                },
              },
            },
          },
        },
      },
    });
    if (!company) throw new NotFoundException(`Company ${company_id} not found`);
    return company;
  }

  async update(company_id: number, dto: UpdateCompanyDto) {
    const data: any = {
      companyCode: dto.companyCode ?? undefined,
      name: dto.name ?? undefined,
      created_by: dto.created_by ?? undefined,
      org_type_id: dto.org_type_id ?? undefined,
    };
    try {
      return await this.prisma.company.update({
        where: { company_id },
        data,
        include: { organizationType: true },
      });
    } catch (e: any) {
      if (e?.code === 'P2025') throw new NotFoundException(`Company ${company_id} not found`);
      if (e?.code === 'P2002') throw new ConflictException('companyCode already exists');
      throw e;
    }
  }

  async remove(company_id: number) {
    try {
      return await this.prisma.company.delete({ where: { company_id } });
    } catch (e: any) {
      if (e?.code === 'P2025') throw new NotFoundException(`Company ${company_id} not found`);
      throw e;
    }
  }
}

