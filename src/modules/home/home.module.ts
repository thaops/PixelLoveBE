import { Module } from '@nestjs/common';
import { HomeController } from './home.controller';
import { HomeService } from './home.service';
import { PetModule } from '../pet/pet.module';
import { RoomModule } from '../room/room.module';
import { BackgroundModule } from '../background/background.module';

/**
 * Home Module
 * Provides virtual home scene endpoint
 */
@Module({
  imports: [
    PetModule,
    RoomModule,
    BackgroundModule,
  ],
  controllers: [HomeController],
  providers: [HomeService],
})
export class HomeModule {}

