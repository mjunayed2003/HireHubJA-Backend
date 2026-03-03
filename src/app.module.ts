import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { MailerModule } from '@nestjs-modules/mailer';
import { JobSeekerModule } from './job-seeker/job-seeker.module';
import { EmployerModule } from './employer/employer.module';
import { CategoryModule } from './category/category.module';
import { UploadController } from './upload/upload.controller';
import { PublicModule } from './public/public.module';


@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'uploads'),
      serveRoot: '/uploads',
    }),
    PrismaModule,
    AuthModule,



    MailerModule.forRoot({
      transport: {
        host: process.env.MAIL_HOST,
        auth: {
          user: process.env.MAIL_USER,
          pass: process.env.MAIL_PASSWORD,
        },
      },
      defaults: {
        from: `"Job Portal Support" <${process.env.MAIL_FROM}>`,
      },
    }),
    JobSeekerModule,
    EmployerModule,
    CategoryModule,
    PublicModule,

  ],
  controllers: [AppController, UploadController],
  providers: [AppService],
})
export class AppModule { }