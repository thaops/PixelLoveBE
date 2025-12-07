import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserBackgroundOwnedDocument = UserBackgroundOwned & Document;

/**
 * UserBackgroundOwned Schema
 * Tracks which backgrounds a user owns (for future use)
 */
@Schema({ timestamps: true })
export class UserBackgroundOwned {
  @Prop({ required: true })
  userId: string;

  @Prop({ required: true })
  backgroundId: string;
}

export const UserBackgroundOwnedSchema = SchemaFactory.createForClass(UserBackgroundOwned);

// Compound index for faster lookups
UserBackgroundOwnedSchema.index({ userId: 1, backgroundId: 1 }, { unique: true });

