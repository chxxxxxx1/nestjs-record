import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { RedisService } from "src/redis/redis.service";
import { md5 } from "src/utils";
import { Repository } from "typeorm";
import { LoginUserDto } from "./dto/login-user.dto";
import { RegisterUserDto } from "./dto/register.dto";
import { Permission } from "./entities/permission.entitie";
import { Role } from "./entities/role.entitie";
import { User } from "./entities/user.entitie";
import { LoginUserVo } from "./vo/login-user.vo";

@Injectable()
export class UserService {
  private logger = new Logger();

  @Inject(RedisService)
  private redisService: RedisService;

  @InjectRepository(User)
  private readonly userRepository: Repository<User>;

  @InjectRepository(Role)
  private readonly roleRepository: Repository<Role>;

  @InjectRepository(Permission)
  private readonly permissionRepository: Repository<Permission>;

  /**
   * @description 注册接口
   */
  async register(user: RegisterUserDto) {
    const captcha = await this.redisService.get(`captcha_${user.email}`);

    if (!captcha) {
      throw new HttpException("验证码已失效", HttpStatus.BAD_REQUEST);
    }

    if (user.captcha !== captcha) {
      throw new HttpException("验证码不正确", HttpStatus.BAD_REQUEST);
    }

    const foundUser = await this.userRepository.findOneBy({
      username: user.username,
    });

    if (foundUser) {
      throw new HttpException("用户已存在", HttpStatus.BAD_REQUEST);
    }

    const newUser = new User();
    newUser.username = user.username;
    newUser.password = md5(user.password);
    newUser.email = user.email;
    newUser.nickName = user.nickName;

    try {
      await this.userRepository.save(newUser);
      return "注册成功";
    } catch (e) {
      this.logger.error(e, UserService);
      return "注册失败";
    }
  }
  /**
   * @description 登陆接口
   */
  async login(user: LoginUserDto, isAdmin: boolean) {
    const currentUser = await this.userRepository.findOne({
      where: {
        username: user.username,
        isAdmin,
      },
      relations: ["roles", "roles.permissions"],
    });

    if (!currentUser) {
      throw new HttpException("用户不存在", HttpStatus.BAD_REQUEST);
    }

    if (currentUser.password !== md5(user.password)) {
      throw new HttpException("密码错误", HttpStatus.BAD_REQUEST);
    }
    const vo = new LoginUserVo();
    vo.userInfo = {
      id: currentUser.id,
      username: currentUser.username,
      nickName: currentUser.nickName,
      email: currentUser.email,
      phoneNumber: currentUser.phoneNumber,
      headPic: currentUser.headPic,
      createTime: currentUser.createTime.getTime(),
      isFrozen: currentUser.isFrozen,
      isAdmin: currentUser.isAdmin,
      roles: currentUser.roles.map((item) => item.name),
      permissions: currentUser.roles.reduce((arr, item) => {
        item.permissions.forEach((permission) => {
          if (arr.indexOf(permission) === -1) {
            arr.push(permission);
          }
        });
        return arr;
      }, []),
    };
    return vo;
  }

  async findUserById(userId: number, isAdmin: boolean) {
    const user = await this.userRepository.findOne({
      where: {
        id: userId,
        isAdmin,
      },
      relations: ["roles", "roles.permissions"],
    });

    return {
      id: user.id,
      username: user.username,
      isAdmin: user.isAdmin,
      roles: user.roles.map((item) => item.name),
      permissions: user.roles.reduce((arr, item) => {
        item.permissions.forEach((permission) => {
          if (arr.indexOf(permission) === -1) {
            arr.push(permission);
          }
        });
        return arr;
      }, []),
    };
  }

  async initData() {
    const user1 = new User();
    user1.username = "zhangsan";
    user1.password = md5("111111");
    user1.email = "xxx@xx.com";
    user1.isAdmin = true;
    user1.nickName = "张三";
    user1.phoneNumber = "13233323333";

    const user2 = new User();
    user2.username = "lisi";
    user2.password = md5("222222");
    user2.email = "yy@yy.com";
    user2.nickName = "李四";

    const role1 = new Role();
    role1.name = "管理员";

    const role2 = new Role();
    role2.name = "普通用户";

    const permission1 = new Permission();
    permission1.code = "ccc";
    permission1.description = "访问 ccc 接口";

    const permission2 = new Permission();
    permission2.code = "ddd";
    permission2.description = "访问 ddd 接口";

    user1.roles = [role1];
    user2.roles = [role2];

    role1.permissions = [permission1, permission2];
    role2.permissions = [permission1];

    await this.permissionRepository.save([permission1, permission2]);
    await this.roleRepository.save([role1, role2]);
    await this.userRepository.save([user1, user2]);
  }
}
