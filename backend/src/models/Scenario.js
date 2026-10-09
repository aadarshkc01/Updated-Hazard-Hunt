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
    // Panorama-only view of the same five hazards.
    //
    // The 360 panorama and the walkthrough are two different depictions of one
    // scenario, so they cannot share coordinates: `pitch`/`yaw` are only ever
    // read by the panorama, and the walkthrough stages props from a separately
    // generated 3D layout. `panoramaSpots` therefore carries its own coordinates
    // and its own hazard wording, while every entry keeps an `id` drawn from
    // `hotspots` so scoring still matches found ids against the canonical set.
    // The walkthrough never reads this field, so panorama work cannot disturb it.
    panoramaSpots: [hotspotSchema],
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
