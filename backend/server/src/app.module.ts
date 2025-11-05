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
import { FunctionModule } from './function/function.module';
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
import { ImportModule } from './import & export/import.module';
import { OrganizationTypeModule } from './organization-type/organization-type.module';
import { HierarchicalViewModule } from './hierarchical-view/hierarchical-view.module';

@Module({
  imports: [
    PrismaModule,
    CompanyModule,
    BuildingModule,
    FloorModule,
    RoomModule,
    TableModule,
    FunctionModule,
    JobModule,
    ProcessModule,
    TaskModule,
    PeopleModule,
    UserModule,
    RoleModule,
    SkillModule,
    AuthModule,
    ImportModule,
    OrganizationTypeModule,
    HierarchicalViewModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
