import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { env } from '../config/env.js';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: 80,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      lowercase: true,
      trim: true,
      maxlength: 254,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      select: false,
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
      required: true,
    },
    interests: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret) => {
        delete ret.password;
        delete ret.__v;
        return ret;
      },
    },
  },
);

userSchema.pre('validate', function normalizeInterests() {
  if (Array.isArray(this.interests)) {
    this.interests = [
      ...new Set(this.interests.map((interest) => interest.trim().toLowerCase()).filter(Boolean)),
    ];
  }
});

userSchema.pre('save', async function hashPassword() {
  if (!this.isModified('password')) {
    return;
  }

  this.password = await bcrypt.hash(this.password, env.bcryptRounds);
});

userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

// Login performs an equality lookup on email; the unique constraint also protects registration.
userSchema.index({ email: 1 }, { unique: true });

// Admin user listing is sorted by newest first with _id as the stable tie-breaker.
userSchema.index({ createdAt: -1, _id: -1 });

// Multikey index for interest equality filters used by the grouping view.
userSchema.index({ interests: 1 });

export const User = mongoose.model('User', userSchema);
