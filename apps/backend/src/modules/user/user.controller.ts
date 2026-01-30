import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { UserService } from './user.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserEntity } from './user.entity';
import { UpdateUserDto } from './dto/update-user.dto';

@Controller('user')
@UseGuards(JwtAuthGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('profile')
  async getProfile(@CurrentUser() user: UserEntity) {
    return this.userService.sanitize(user);
  }

  @Put('profile')
  async updateProfile(
    @CurrentUser() user: UserEntity,
    @Body() dto: UpdateUserDto,
  ) {
    const updated = await this.userService.updateProfile(user.id, dto);
    return this.userService.sanitize(updated);
  }
}
