import { Body, Controller, Get, Inject, Post, Query } from "@nestjs/common";
import { EmailService } from "src/email/email.service";
import { RedisService } from "src/redis/redis.service";
import { RegisterUserDto } from "./dto/register.dto";
import { UserService } from "./user.service";

@Controller("api/v1/user")
export class UserController {
  @Inject(EmailService)
  private emailService: EmailService;
  @Inject(RedisService)
  private redisService: RedisService;
  constructor(private readonly userService: UserService) {}

  @Post("register")
  async register(@Body() user: RegisterUserDto) {
    return this.userService.register(user);
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
}
