import {
  Controller,
  Get,
  Put,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { UserService } from './user.service';
import { JwtAuthGuard, AdminGuard } from '../../common/guards';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserEntity } from './user.entity';
import { UpdateUserDto } from './dto/update-user.dto';
import {
  AdminCreateUserDto,
  AdminUpdateUserDto,
  ChangeRoleDto,
  ResetPasswordDto,
  BanUserDto,
} from './dto/admin-user.dto';

@Controller()
export class UserController {
  constructor(private readonly userService: UserService) {}

  // ============ USER ENDPOINTS ============

  @Get('user/profile')
  @UseGuards(JwtAuthGuard)
  async getProfile(@CurrentUser() user: UserEntity) {
    return this.userService.sanitize(user);
  }

  @Put('user/profile')
  @UseGuards(JwtAuthGuard)
  async updateProfile(
    @CurrentUser() user: UserEntity,
    @Body() dto: UpdateUserDto,
  ) {
    const updated = await this.userService.updateProfile(user.id, dto);
    return this.userService.sanitize(updated);
  }

  /**
   * GET /api/user/profile/:userId - Get public player profile with stats
   * Accessible by any authenticated user
   */
  @Get('user/profile/:userId')
  @UseGuards(JwtAuthGuard)
  async getPublicProfile(@Param('userId', ParseIntPipe) userId: number) {
    return this.userService.getPublicProfile(userId);
  }

  // ============ ADMIN ENDPOINTS ============

  /**
   * GET /api/admin/users - Get all users with pagination
   */
  @Get('admin/users')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async getAllUsers(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = parseInt(page || '1', 10);
    const limitNum = parseInt(limit || '20', 10);
    const { users, total } = await this.userService.getAllUsers(pageNum, limitNum);
    return {
      users: users.map(u => this.userService.sanitizeForAdmin(u)),
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    };
  }

  /**
   * GET /api/admin/users/:id - Get user by ID
   */
  @Get('admin/users/:id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async getAdminUserById(@Param('id', ParseIntPipe) id: number) {
    const user = await this.userService.getAdminUserById(id);
    return this.userService.sanitizeForAdmin(user);
  }

  /**
   * POST /api/admin/users - Create a new user
   */
  @Post('admin/users')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async createUser(@Body() dto: AdminCreateUserDto) {
    const user = await this.userService.adminCreateUser(dto);
    return this.userService.sanitizeForAdmin(user);
  }

  /**
   * PUT /api/admin/users/:id - Update a user
   */
  @Put('admin/users/:id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async updateUser(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AdminUpdateUserDto,
  ) {
    const user = await this.userService.adminUpdateUser(id, dto);
    return this.userService.sanitizeForAdmin(user);
  }

  /**
   * PATCH /api/admin/users/:id/role - Change user role
   */
  @Patch('admin/users/:id/role')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async changeRole(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ChangeRoleDto,
  ) {
    const user = await this.userService.changeRole(id, dto.role);
    return this.userService.sanitizeForAdmin(user);
  }

  /**
   * PATCH /api/admin/users/:id/reset-password - Reset user password
   */
  @Patch('admin/users/:id/reset-password')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async resetPassword(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ResetPasswordDto,
  ) {
    await this.userService.resetPassword(id, dto.password);
    return { success: true };
  }

  /**
   * PATCH /api/admin/users/:id/ban - Ban or unban user
   */
  @Patch('admin/users/:id/ban')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async setBanStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: BanUserDto,
  ) {
    const user = await this.userService.setBanStatus(id, dto.banned);
    return this.userService.sanitizeForAdmin(user);
  }

  /**
   * DELETE /api/admin/users/:id - Delete a user
   */
  @Delete('admin/users/:id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async deleteUser(@Param('id', ParseIntPipe) id: number) {
    await this.userService.deleteUser(id);
    return { success: true };
  }
}
