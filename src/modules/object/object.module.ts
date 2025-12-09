import { Module } from '@nestjs/common';
import { ObjectService } from './object.service';

/**
 * Object Module
 * Manages room objects/furniture master data and default objects
 */
@Module({
  providers: [ObjectService],
  exports: [ObjectService],
})
export class ObjectModule {}

