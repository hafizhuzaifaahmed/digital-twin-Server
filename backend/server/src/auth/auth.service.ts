import { Injectable, NotFoundException, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) { }

  async validateUserByIdentifier(identifier: string, password: string) {
    // Identifier is email in the new schema
    const user = await this.prisma.user.findFirst({
      where: { email: identifier },
      include: { role: true },
    });
    if (!user) throw new NotFoundException('Invalid credentials');

    if (!user.password) throw new UnauthorizedException('Invalid credentials');
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) throw new UnauthorizedException('Invalid credentials');

    return user;
  }



  async validate3dUserByIdentifier(identifier: string, password: string) {
    // Identifier is email in the new schema
    const user3D = await this.prisma.users_3d.findFirst({
      where: { email: identifier },
      include: {
        company: true,
        linkedUser: {
          include: {
            role: true,
            company: true,
          },
        },
      },
    });

    if (!user3D) throw new NotFoundException('Invalid email or password');
    const ok = await bcrypt.compare(password, user3D.password);
    if (!ok) throw new UnauthorizedException('Invalid password and email');
    return user3D;
  }

  async login3dUser(identifier: string, password: string) {
    const user3D = await this.validate3dUserByIdentifier(identifier, password);

    // Determine company access based on linked user's role
    let companyAccess: 'all' | 'single' = 'single';
    let accessibleCompanyId: number | null = user3D.company_id;

    if (user3D.linkedUser) {
      const linkedUserRole = user3D.linkedUser.role?.name;
      if (linkedUserRole === 'SUPER_ADMIN') {
        companyAccess = 'all';
        accessibleCompanyId = null; // null means all companies
      } else if (user3D.linkedUser.company_id) {
        accessibleCompanyId = user3D.linkedUser.company_id;
      }
    }

    const payload = {
      sub: user3D.id,
      email: user3D.email,
      name: user3D.name,
      company_id: user3D.company_id,
      company_access: companyAccess,
      accessible_company_id: accessibleCompanyId,
      linked_user_id: user3D.user_id,
    };
    const access_token = await this.jwtService.signAsync(payload);
    return {
      access_token,
      user: {
        user_3d_id: user3D.id,
        email: user3D.email,
        name: user3D.name,
        company_id: user3D.company_id,
        company: user3D.company,
        company_access: companyAccess,
        accessible_company_id: accessibleCompanyId,
        linked_user: user3D.linkedUser ? {
          user_id: user3D.linkedUser.user_id,
          name: user3D.linkedUser.name,
          email: user3D.linkedUser.email,
          role: user3D.linkedUser.role?.name,
          company_id: user3D.linkedUser.company_id,
        } : null,
      },
    };
  }


  async login(identifier: string, password: string) {
    const user = await this.validateUserByIdentifier(identifier, password);

    const payload = {
      sub: user.user_id,
      email: user.email,
      role: user.role?.name ?? 'USER',
      name: user.name,
    };
    const access_token = await this.jwtService.signAsync(payload);
    return { access_token, user: { user_id: user.user_id, email: user.email, role: payload.role, name: user.name } };
  }

  async register(requestorUserId: number, dto: { name: string; email: string; password: string; role_id: number }) {
    // Ensure requestor is SUPER_ADMIN
    const requestor = await this.prisma.user.findUnique({ where: { user_id: requestorUserId }, include: { role: true } });
    if (!requestor || requestor.role?.name !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Only SUPER_ADMIN can register users');
    }

    const hashed = await bcrypt.hash(dto.password, 10);
    const created = await this.prisma.user.create({
      data: {
        email: dto.email,
        name: dto.name,
        password: hashed,
        role_id: dto.role_id ?? undefined,
      },
      include: { role: true },
    });

    return { user_id: created.user_id, email: created.email, name: created.name, role: created.role?.name };
  }
}
