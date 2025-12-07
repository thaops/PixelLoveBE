import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BackgroundService } from './background.service';
import { Background, BackgroundSchema } from './schemas/background.schema';
import { UserBackgroundOwned, UserBackgroundOwnedSchema } from './schemas/user-background-owned.schema';

/**
 * Background Module
 * Manages background master data and user ownership
 */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Background.name, schema: BackgroundSchema },
      { name: UserBackgroundOwned.name, schema: UserBackgroundOwnedSchema },
    ]),
  ],
  providers: [BackgroundService],
  exports: [BackgroundService],
})
export class BackgroundModule {}

