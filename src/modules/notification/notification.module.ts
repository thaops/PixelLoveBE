import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { NotificationService } from './notification.service';
import { NotificationSettings, NotificationSettingsSchema } from './schemas/notification-settings.schema';
import { NotificationLog, NotificationLogSchema } from './schemas/notification-log.schema';
import { User, UserSchema } from '../user/schemas/user.schema';
import { UserDevice, UserDeviceSchema } from '../device/schemas/user-device.schema';
import { NotificationTestController } from './notification.test.controller';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: NotificationSettings.name, schema: NotificationSettingsSchema },
            { name: NotificationLog.name, schema: NotificationLogSchema },
            { name: User.name, schema: UserSchema },
            { name: UserDevice.name, schema: UserDeviceSchema },
        ]),
    ],
    controllers: [NotificationTestController],
    providers: [NotificationService],
    exports: [NotificationService],
})
export class NotificationModule { }
