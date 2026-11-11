const mongoose = require('mongoose');

const revisionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true
    },
    topicId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Topic',
      required: [true, 'Topic ID is required'],
      index: true
    },
    revisionNumber: {
      type: Number,
      required: [true, 'Revision number is required'],
      min: 1,
      max: 9
    },
    scheduledDate: {
      type: String,
      required: [true, 'Scheduled date is required'],
      match: [/^\d{4}-\d{2}-\d{2}$/, 'Scheduled date must be in YYYY-MM-DD format']
    },
    status: {
      type: String,
      enum: {
        values: ['PENDING', 'COMPLETED'],
        message: '{VALUE} is not a valid status'
      },
      default: 'PENDING'
    },
    completedAt: {
      type: Date,
      default: null
    },
    understandingLevel: {
      type: String,
      enum: {
        values: ['EASY', 'MEDIUM', 'HARD', null],
        message: '{VALUE} is not a valid understanding level'
      },
      default: null
    },
    recallAssistance: {
      type: String,
      enum: {
        values: ['INDEPENDENT', 'PARTIAL', 'NEEDED_RESOURCES', null],
        message: '{VALUE} is not a valid recall assistance level'
      },
      default: null
    },
    revisionNotes: {
      type: String,
      trim: true,
      default: '',
      maxlength: [2000, 'Revision notes cannot exceed 2,000 characters']
    }
  },
  {
    timestamps: true
  }
);

// Prevent duplicate revision numbers for the same topic
revisionSchema.index({ topicId: 1, revisionNumber: 1 }, { unique: true });

// Optimize query for dashboard today/overdue and user progress
revisionSchema.index({ userId: 1, scheduledDate: 1, status: 1 });
revisionSchema.index({ userId: 1, status: 1 });
revisionSchema.index({ userId: 1, completedAt: -1 });

const Revision = mongoose.model('Revision', revisionSchema);

module.exports = Revision;

