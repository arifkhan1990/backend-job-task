import mongoose from 'mongoose';

const refreshTokenSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    tokenHash: {
      type: String,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    revokedAt: {
      type: Date,
      default: null,
    },
    replacedByHash: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret) => {
        delete ret.tokenHash;
        delete ret.replacedByHash;
        delete ret.__v;
        return ret;
      },
    },
  },
);

// Refresh uses a hash lookup; the unique constraint also makes accidentally
// issuing the same token twice impossible.
refreshTokenSchema.index({ tokenHash: 1 }, { unique: true });

// Logout-all and password changes revoke every active session for a user.
refreshTokenSchema.index({ user: 1, createdAt: -1 });

// MongoDB removes expired rows automatically.
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const RefreshToken = mongoose.model('RefreshToken', refreshTokenSchema);
