import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createTransport, Transporter } from "nodemailer";

@Injectable()
export class EmailService {
  transporter: Transporter;

  constructor(private configService: ConfigService) {
    this.transporter = createTransport({
      host: configService.get("nodemailer_host"),
      port: configService.get("nodemailer_port"),
      secure: false,
      auth: {
        user: configService.get("nodemailer_auth_user"),
        pass: configService.get("nodemailer_auth_pass"),
      },
    });
  }

  async sendMail({ to, subject, html }) {
    await this.transporter.sendMail({
      from: {
        name: "会议室预定系统",
        address: this.configService.get("nodemailer_auth_user"),
      },
      to,
      subject,
      html,
    });
  }
}
