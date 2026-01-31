import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from './user.entity';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
  ) {}

  async findById(id: number): Promise<UserEntity> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async updateProfile(userId: number, dto: UpdateUserDto): Promise<UserEntity> {
    const user = await this.findById(userId);

    if (dto.displayName !== undefined) user.displayName = dto.displayName;
    if (dto.avatarUrl !== undefined) user.avatarUrl = dto.avatarUrl;
    if (dto.qrCodeUrl !== undefined) user.qrCodeUrl = dto.qrCodeUrl;

    return this.userRepository.save(user);
  }

  async incrementWinCount(userId: number): Promise<void> {
    await this.userRepository.increment({ id: userId }, 'winCount', 1);
  }

  sanitize(user: UserEntity) {
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      qrCodeUrl: user.qrCodeUrl,
      winCount: user.winCount ?? 0,
    };
  }
}
