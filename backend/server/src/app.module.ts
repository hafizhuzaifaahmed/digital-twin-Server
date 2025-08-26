import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { CompanyModule } from './company/company.module';
import { BuildingModule } from './building/building.module';
import { FloorModule } from './floor/floor.module';
import { RoomModule } from './room/room.module';
import { TableModule } from './table/table.module';
import { RenamedfunctionModule } from './renamedfunction/renamedfunction.module';
import { JobModule } from './job/job.module';
import { ProcessModule } from './process/process.module';
import { TaskModule } from './task/task.module';
import { PeopleModule } from './people/people.module';
import { UserModule } from './user/user.module';
import { RoleModule } from './role/role.module';
import { SkillModule } from './skill/skill.module';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { RolesGuard } from './auth/roles.guard';

@Module({
  imports: [
    PrismaModule,
    CompanyModule,
    BuildingModule,
    FloorModule,
    RoomModule,
    TableModule,
    RenamedfunctionModule,
    JobModule,
    ProcessModule,
    TaskModule,
    PeopleModule,
    UserModule,
    RoleModule,
    SkillModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
