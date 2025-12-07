import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PetController } from './pet.controller';
import { PetService } from './pet.service';
import { Pet, PetSchema } from './schemas/pet.schema';
import { PetAction, PetActionSchema } from './schemas/pet-action.schema';
import { CoupleModule } from '../couple/couple.module';
import { AlbumModule } from '../album/album.module';

/**
 * Pet Module
 * Handles pet progression with petting/image actions
 */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Pet.name, schema: PetSchema },
      { name: PetAction.name, schema: PetActionSchema },
    ]),
    forwardRef(() => CoupleModule),
    AlbumModule,
  ],
  controllers: [PetController],
  providers: [PetService],
  exports: [PetService],
})
export class PetModule {}

