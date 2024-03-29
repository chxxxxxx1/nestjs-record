import {
  Body,
  Controller,
  Get,
  Inject,
  Post,
  Query,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { EmailService } from "src/email/email.service";
import { RedisService } from "src/redis/redis.service";
import { RequireLogin } from "../utils/decorator/custom.decorator";
import { LoginUserDto } from "./dto/login-user.dto";
import { RegisterUserDto } from "./dto/register.dto";
import { UserService } from "./user.service";

@Controller("user")
export class UserController {
  @Inject(EmailService)
  private emailService: EmailService;
  @Inject(RedisService)
  private redisService: RedisService;
  constructor(private readonly userService: UserService) {}
  @Inject(JwtService)
  private jwtService: JwtService;
  @Inject(ConfigService)
  private configService: ConfigService;

  @Post("register")
  async register(@Body() user: RegisterUserDto) {
    return this.userService.register(user);
  }
  @Get("init-data")
  async initData() {
    await this.userService.initData();
    return "done";
  }

  @Get("register-captcha")
  async captcha(@Query("address") address: string) {
    const code = Math.random().toString().slice(2, 8);

    await this.redisService.set(`captcha_${address}`, code, 5 * 60);

    await this.emailService.sendMail({
      to: address,
      subject: "注册验证码",
      html: `<p>你的注册验证码是 ${code}</p>`,
    });
    return "发送成功";
  }

  @Post("login")
  async userLogin(@Body() loginUser: LoginUserDto) {
    const vo = await this.userService.login(loginUser, false);
    vo.accessToken = this.jwtService.sign(
      {
        userId: vo.userInfo.id,
        username: vo.userInfo.username,
        roles: vo.userInfo.roles,
        permissions: vo.userInfo.permissions,
      },
      {
        expiresIn:
          this.configService.get("jwt_access_token_expires_time") || "30m",
      }
    );
    vo.refreshToken = this.jwtService.sign(
      {
        userId: vo.userInfo.id,
      },
      {
        expiresIn:
          this.configService.get("jwt_refresh_token_expres_time") || "7d",
      }
    );
    return vo;
  }

  @Post("admin/login")
  async adminLogin(@Body() loginUser: LoginUserDto) {
    const vo = await this.userService.login(loginUser, true);
    vo.accessToken = this.jwtService.sign(
      {
        userId: vo.userInfo.id,
        username: vo.userInfo.username,
        roles: vo.userInfo.roles,
        permissions: vo.userInfo.permissions,
      },
      {
        expiresIn:
          this.configService.get("jwt_access_token_expires_time") || "30m",
      }
    );
    vo.refreshToken = this.jwtService.sign(
      {
        userId: vo.userInfo.id,
      },
      {
        expiresIn:
          this.configService.get("jwt_refresh_token_expres_time") || "7d",
      }
    );
    return vo;
  }

  @Get("refresh")
  @RequireLogin()
  async refresh(@Query("refreshToken") refreshToken: string) {
    try {
      const data = this.jwtService.verify(refreshToken);

      const user = await this.userService.findUserById(data.userId, false);

      const access_token = this.jwtService.sign(
        {
          userId: user.id,
          username: user.username,
          roles: user.roles,
          permissions: user.permissions,
        },
        {
          expiresIn:
            this.configService.get("jwt_access_token_expires_time") || "30m",
        }
      );

      const refresh_token = this.jwtService.sign(
        {
          userId: user.id,
        },
        {
          expiresIn:
            this.configService.get("jwt_refresh_token_expres_time") || "7d",
        }
      );

      return {
        access_token,
        refresh_token,
      };
    } catch (e) {
      throw new UnauthorizedException("token 已失效，请重新登录");
    }
  }
}
