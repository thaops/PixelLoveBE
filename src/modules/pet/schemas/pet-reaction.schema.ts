import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type PetReactionDocument = PetReaction & Document;

/**
 * Pet Reaction Schema
 * Stores emoji reactions for pet actions (images)
 */
@Schema({ timestamps: true })
export class PetReaction {
    @Prop({ type: Types.ObjectId, ref: 'PetAction', required: true })
    petActionId: Types.ObjectId;

    @Prop({ required: true })
    userId: string;

    @Prop({ required: true })
    emoji: string;

    @Prop({ default: 0 })
    count: number;
}

export const PetReactionSchema = SchemaFactory.createForClass(PetReaction);

// Compound index for fast upsert and querying
PetReactionSchema.index({ petActionId: 1, userId: 1, emoji: 1 }, { unique: true });
PetReactionSchema.index({ petActionId: 1 });
