import mongoose from 'mongoose';

const noteSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: 200,
    },
    content: {
      type: String,
      required: [true, 'Content is required'],
      maxlength: 20000,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret) => {
        delete ret.__v;
        return ret;
      },
    },
  },
);

// A user's note list filters by owner and sorts by newest first.
// The same index serves an admin filtering the all-notes view by owner.
noteSchema.index({ owner: 1, createdAt: -1, _id: -1 });

// The admin all-notes view sorts across every owner.
noteSchema.index({ createdAt: -1, _id: -1 });

export const Note = mongoose.model('Note', noteSchema);
