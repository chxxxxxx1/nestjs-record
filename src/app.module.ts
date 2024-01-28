import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { JwtModule } from "@nestjs/jwt";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { EmailModule } from "./email/email.module";
import { LoginGuard } from "./login.guard";
import { RedisModule } from "./redis/redis.module";
import { Permission } from "./user/entities/permission.entitie";
import { Role } from "./user/entities/role.entitie";
import { User } from "./user/entities/user.entitie";
import { UserModule } from "./user/user.module";

@Module({
  imports: [
    JwtModule.registerAsync({
      global: true,
      useFactory(configService: ConfigService) {
        return {
          secret: configService.get("jwt_secret"),
          signOptions: {
            expiresIn: "30m",
          },
        };
      },
      inject: [ConfigService],
    }),
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ["src/.env"],
    }),
    TypeOrmModule.forRootAsync({
      useFactory(configService: ConfigService) {
        return {
          type: "mysql",
          host: configService.get("mysql_server_host"),
          port: configService.get("mysql_server_port"),
          username: configService.get("mysql_server_username"),
          password: configService.get("mysql_server_password"),
          database: configService.get("mysql_server_database"),
          synchronize: true,
          logging: true,
          entities: [User, Role, Permission],
          poolSize: 10,
          connectorPackage: "mysql2",
          extra: {
            authPlugin: "sha256_password",
          },
        };
      },
      inject: [ConfigService],
    }),
    UserModule,

    RedisModule,
    EmailModule,
  ],
  controllers: [AppController],
  providers: [AppService, { provide: APP_GUARD, useClass: LoginGuard }],
})
export class AppModule {}
