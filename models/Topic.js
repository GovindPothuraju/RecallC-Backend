const mongoose = require('mongoose');

const resourceSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Resource title is required'],
      trim: true,
      maxlength: [150, 'Resource title cannot exceed 150 characters']
    },
    url: {
      type: String,
      required: [true, 'Resource URL is required'],
      trim: true
    },
    type: {
      type: String,
      enum: {
        values: ['YOUTUBE', 'BLOG', 'GITHUB', 'DOCUMENTATION', 'OTHER'],
        message: '{VALUE} is not a valid resource type'
      },
      default: 'OTHER'
    },
    description: {
      type: String,
      trim: true,
      default: '',
      maxlength: [500, 'Resource description cannot exceed 500 characters']
    },
    order: {
      type: Number,
      default: 0
    }
  },
  { _id: true }
);

const PRESET_CATEGORIES = [
  'DSA',
  'Java',
  'OOPS',
  'DBMS',
  'SQL',
  'Operating Systems',
  'Computer Networks',
  'JavaScript',
  'React',
  'Node.js',
  'System Design',
  'Other'
];

const topicSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true
    },
    title: {
      type: String,
      required: [true, 'Topic title is required'],
      trim: true,
      minlength: [2, 'Topic title must be at least 2 characters'],
      maxlength: [150, 'Topic title cannot exceed 150 characters']
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true
    },
    subcategory: {
      type: String,
      trim: true,
      default: '',
      maxlength: [100, 'Subcategory cannot exceed 100 characters']
    },
    studyDate: {
      type: String,
      required: [true, 'Study date is required'],
      match: [/^\d{4}-\d{2}-\d{2}$/, 'Study date must be in YYYY-MM-DD format']
    },
    notes: {
      type: String,
      trim: true,
      default: '',
      maxlength: [10000, 'Notes cannot exceed 10,000 characters']
    },
    resources: {
      type: [resourceSchema],
      default: []
    }
  },
  {
    timestamps: true
  }
);

topicSchema.index({ userId: 1, createdAt: -1 });
topicSchema.index({ userId: 1, category: 1 });
topicSchema.index({ userId: 1, title: 1 });

const Topic = mongoose.model('Topic', topicSchema);

module.exports = {
  Topic,
  PRESET_CATEGORIES
};

