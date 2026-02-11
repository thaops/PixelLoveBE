import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { NotificationService } from './notification.service';
import { NotificationSettings, NotificationSettingsSchema } from './schemas/notification-settings.schema';
import { NotificationLog, NotificationLogSchema } from './schemas/notification-log.schema';
import { User, UserSchema } from '../user/schemas/user.schema';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: NotificationSettings.name, schema: NotificationSettingsSchema },
            { name: NotificationLog.name, schema: NotificationLogSchema },
            { name: User.name, schema: UserSchema },
        ]),
    ],
    providers: [NotificationService],
    exports: [NotificationService],
})
export class NotificationModule { }
