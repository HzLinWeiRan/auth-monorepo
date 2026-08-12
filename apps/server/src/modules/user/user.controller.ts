import { Controller, Post, Get, Body, HttpCode } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { UserService } from './user.service';
import { RegisterDto } from './dto/register.dto';
import {
  RegisterResponseDto,
  ProfileResponseDto,
} from './dto/user-response.dto';
import { ErrorResponseDto } from '../../common/dto/response.dto';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { success } from '../../common/dto/response.dto';

@ApiTags('users')
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Public()
  @Post('register')
  @HttpCode(201)
  @ApiOperation({ summary: '注册新用户' })
  @ApiResponse({
    status: 201,
    description: '注册成功，返回用户基本信息（不含密码）',
    type: RegisterResponseDto,
  })
  @ApiResponse({
    status: 409,
    description: '用户名已存在',
    type: ErrorResponseDto,
  })
  async register(@Body() dto: RegisterDto) {
    const user = await this.userService.register(dto);
    return success(
      {
        id: user.id,
        username: user.username,
        email: user.email,
      },
      '注册成功',
      201,
    );
  }

  @ApiBearerAuth('access-token')
  @Get('profile')
  @ApiOperation({ summary: '获取当前登录用户资料' })
  @ApiResponse({
    status: 200,
    description: '成功，返回当前登录用户的完整资料（含创建时间）',
    type: ProfileResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: '未携带或令牌无效',
    type: ErrorResponseDto,
  })
  async profile(@CurrentUser() user: { id: string }) {
    const full = await this.userService.findById(user.id);
    return success({
      id: full.id,
      username: full.username,
      email: full.email,
      createdAt: full.createdAt,
    });
  }
}
