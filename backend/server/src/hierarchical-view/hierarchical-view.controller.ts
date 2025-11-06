import { Controller, Get, Param, ParseIntPipe, Post, Body } from '@nestjs/common';
import { HierarchicalViewService } from './hierarchical-view.service';
import { UserIdsDto } from './dto/hierarchical-dto';
import { BatchProcessResult } from './dto/hierarchical-types';
@Controller('hierarchical-view')
export class HierarchicalViewController {
  constructor(private readonly hierarchicalViewService: HierarchicalViewService) { }


  @Get('relation/:userId')
  getUserHierarchy(@Param('userId', ParseIntPipe) userId: number) {
    return this.hierarchicalViewService.getUserHierarchy(userId);
  }

  @Get('relation/building/:userId')
  getBuildingHierarchy(@Param('userId', ParseIntPipe) userId: number) {
    return this.hierarchicalViewService.getBuildingData(userId);
  }

  @Post('relation/bulk')
  getUserHierarchyBulk(@Body('userIds') userIds: number[]): Promise<BatchProcessResult> {
    return this.hierarchicalViewService.getUserHierarchyByUserIds(userIds);
  }

  @Post('relation/building/bulk')
  getBuildingHierarchyBulk(@Body() dto: UserIdsDto): Promise<BatchProcessResult> {
    return this.hierarchicalViewService.getBuildingDataByUserIds(dto.userIds);
  }

  @Post('relation/company/bulk')
  getCompanyHierarchyBulk(@Body() dto: UserIdsDto): Promise<BatchProcessResult> {
    return this.hierarchicalViewService.getCompanyDataByUserIds(dto.userIds);
  }
  @Post('relation/process/bulk')
  getProcessHierarchyBulk(@Body() dto: UserIdsDto): Promise<BatchProcessResult> {
    return this.hierarchicalViewService.getProcessDataByUserIds(dto.userIds);
  }
  @Post('relation/function/bulk')
  getFunctionHierarchyBulk(@Body() dto: UserIdsDto): Promise<BatchProcessResult> {
    return this.hierarchicalViewService.getFunctionsDataByUserIds(dto.userIds);
  }

  @Post('relation/task/bulk')
  getTaskHierarchyBulk(@Body() dto: UserIdsDto): Promise<BatchProcessResult> {
    return this.hierarchicalViewService.getTaskDataByUserIds(dto.userIds);
  }
  @Post('relation/job/bulk')
  getJobHierarchyBulk(@Body() dto: UserIdsDto): Promise<BatchProcessResult> {
    return this.hierarchicalViewService.getJobDataByUserIds(dto.userIds);
  }
  @Post('relation/floor/bulk')
  getFloorHierarchyBulk(@Body() dto: UserIdsDto): Promise<BatchProcessResult> {
    return this.hierarchicalViewService.getFloorDataByUserIds(dto.userIds);
  }
}