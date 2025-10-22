import { Injectable, NotFoundException, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

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
