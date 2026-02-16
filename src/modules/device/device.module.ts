import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DeviceController } from './device.controller';
import { DeviceService } from './device.service';
import { UserDevice, UserDeviceSchema } from './schemas/user-device.schema';
import { User, UserSchema } from '../user/schemas/user.schema';
import { NotificationModule } from '../notification/notification.module';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: UserDevice.name, schema: UserDeviceSchema },
            { name: User.name, schema: UserSchema },
        ]),
        NotificationModule,
    ],
    controllers: [DeviceController],
    providers: [DeviceService],
    exports: [DeviceService],
})
export class DeviceModule { }
