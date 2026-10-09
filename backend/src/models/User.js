import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, 'Username is required'],
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: 6,
      // Credentials must never leave the server. `select: false` makes this the
      // schema's default for EVERY query, including `.lean()` reads, so a new
      // endpoint cannot leak a hash by forgetting a projection.
      select: false,
    },
    // Retired field. An earlier schema stored the bcrypt hash here; five legacy
    // documents still carry it. Nothing reads or writes it any more, but because
    // `.lean()` returns raw BSON, those hashes were being served to admin and
    // supervisor clients. Declaring it here with `select: false` closes that at
    // the schema, so it is excluded by default just like `password`.
    passwordHash: {
      type: String,
      select: false,
    },
    name: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
    },
    role: {
      type: String,
      enum: ['employee', 'supervisor', 'admin'],
      default: 'employee',
      required: true,
    },
    department: {
      type: String,
      default: 'Automotive Logistics Bay 4',
      trim: true,
    },
    hasCompletedOnboarding: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

userSchema.pre('save', async function (next) {
  if (this.role !== 'employee' && this.hasCompletedOnboarding === undefined) {
    this.hasCompletedOnboarding = true;
  }

  if (!this.isModified('password')) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

export const User = mongoose.model('User', userSchema);
