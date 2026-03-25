const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  post: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post',
    required: [true, 'Post reference is required'],
    index: true
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Author is required']
  },
  content: {
    type: String,
    required: [true, 'Comment content is required'],
    maxlength: [1000, 'Comment cannot exceed 1000 characters'],
    trim: true
  },
  parentComment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment',
    default: null,
    index: true
  },
  replies: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment'
  }],
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  likesCount: {
    type: Number,
    default: 0
  },
  isEdited: {
    type: Boolean,
    default: false
  },
  editedAt: {
    type: Date,
    default: null
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index for faster queries
commentSchema.index({ post: 1, createdAt: -1 });
commentSchema.index({ author: 1, createdAt: -1 });
commentSchema.index({ parentComment: 1 });

// Pre-save middleware to update post comment count
commentSchema.pre('save', async function(next) {
  if (this.isNew) {
    try {
      const Post = mongoose.model('Post');
      await Post.findByIdAndUpdate(
        this.post,
        { $inc: { commentsCount: 1 } }
      );
    } catch (error) {
      console.error('Error updating post comment count:', error);
    }
  }
  next();
});

// Pre-remove middleware to update post comment count
commentSchema.pre('remove', async function(next) {
  try {
    const Post = mongoose.model('Post');
    await Post.findByIdAndUpdate(
      this.post,
      { $inc: { commentsCount: -1 } }
    );
  } catch (error) {
    console.error('Error updating post comment count:', error);
  }
  next();
});

// Method to soft delete
commentSchema.methods.softDelete = async function() {
  this.isDeleted = true;
  this.deletedAt = new Date();
  this.content = '[deleted]';
  return this.save();
};

// Method to add reply
commentSchema.methods.addReply = async function(replyId) {
  if (!this.replies.includes(replyId)) {
    this.replies.push(replyId);
    return this.save();
  }
};

// Static method to get comments by post
commentSchema.statics.getByPost = async function(postId, options = {}) {
  const { page = 1, limit = 20, sortBy = 'newest' } = options;
  const skip = (page - 1) * limit;
  
  let sortOption = { createdAt: -1 };
  if (sortBy === 'oldest') sortOption = { createdAt: 1 };
  if (sortBy === 'popular') sortOption = { likesCount: -1, createdAt: -1 };
  
  const comments = await this.find({ 
    post: postId, 
    parentComment: null,
    isDeleted: false 
  })
    .populate('author', 'username avatar isOnline')
    .populate({
      path: 'replies',
      populate: {
        path: 'author',
        select: 'username avatar isOnline'
      },
      match: { isDeleted: false },
      options: { sort: { createdAt: 1 } }
    })
    .sort(sortOption)
    .skip(skip)
    .limit(limit)
    .lean();
  
  const total = await this.countDocuments({ 
    post: postId, 
    parentComment: null,
    isDeleted: false 
  });
  
  return {
    comments,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
      hasMore: page * limit < total
    }
  };
};

// Static method to get comments by user
commentSchema.statics.getByUser = async function(userId, options = {}) {
  const { page = 1, limit = 20 } = options;
  const skip = (page - 1) * limit;
  
  const comments = await this.find({ 
    author: userId,
    isDeleted: false 
  })
    .populate('post', 'content')
    .populate('author', 'username avatar')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();
  
  const total = await this.countDocuments({ 
    author: userId,
    isDeleted: false 
  });
  
  return {
    comments,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
      hasMore: page * limit < total
    }
  };
};

module.exports = mongoose.model('Comment', commentSchema);
