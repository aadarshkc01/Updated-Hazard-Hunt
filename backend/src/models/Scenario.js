import mongoose from 'mongoose';

const hotspotSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    title: { type: String, required: true },
    category: { type: String, required: true },
    pitch: { type: Number, required: true },
    yaw: { type: Number, required: true },
    radius: { type: Number, default: 8 },
    isHazard: { type: Boolean, default: true },
    severity: {
      type: String,
      enum: ['Low', 'Medium', 'High', 'Critical'],
      default: 'High',
    },
    explanation: { type: String, required: true },
    correctAction: { type: String, required: true },
  },
  { _id: false }
);

const quizQuestionSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    question: { type: String, required: true },
    options: [{ type: String, required: true }],
    correctIndex: { type: Number, required: true },
    explanation: { type: String, required: true },
    category: { type: String },
  },
  { _id: false }
);

const scenarioSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    facility: {
      type: String,
      default: 'Sunderland Logistics Hub',
    },
    panoramaUrl: {
      type: String,
      required: true,
    },
    timeLimitSeconds: {
      type: Number,
      default: 90,
    },
    passingScorePercentage: {
      type: Number,
      default: 75,
    },
    hotspots: [hotspotSchema],
    quizQuestions: [quizQuestionSchema],
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Scenario = mongoose.model('Scenario', scenarioSchema);
