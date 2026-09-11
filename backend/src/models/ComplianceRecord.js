import mongoose from 'mongoose';

const complianceRecordSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    userName: {
      type: String,
      required: true,
    },
    department: {
      type: String,
      default: 'Warehouse Operations',
    },
    scenarioId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Scenario',
      required: true,
    },
    scenarioTitle: {
      type: String,
      required: true,
    },
    isPracticeMode: {
      type: Boolean,
      default: false,
    },
    hazardsFound: [
      {
        id: String,
        title: String,
        category: String,
        severity: String,
      },
    ],
    hazardsMissed: [
      {
        id: String,
        title: String,
        category: String,
        severity: String,
      },
    ],
    falseClicksCount: {
      type: Number,
      default: 0,
    },
    timeTakenSeconds: {
      type: Number,
      required: true,
    },
    timeLimitSeconds: {
      type: Number,
      default: 90,
    },
    hazardScore: {
      type: Number,
      required: true,
    },
    quizScore: {
      type: Number,
      required: true,
    },
    totalScore: {
      type: Number,
      required: true,
    },
    passed: {
      type: Boolean,
      required: true,
    },
    passingThreshold: {
      type: Number,
      default: 75,
    },
    quizAnswers: [
      {
        questionId: String,
        selectedOption: Number,
        isCorrect: Boolean,
      },
    ],
    completedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for fast lookup by supervisor and trainee history
complianceRecordSchema.index({ userId: 1, completedAt: -1 });
complianceRecordSchema.index({ isPracticeMode: 1, passed: 1 });

export const ComplianceRecord = mongoose.model('ComplianceRecord', complianceRecordSchema);
