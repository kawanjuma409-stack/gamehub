const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Recipient is required'],
    index: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Sender is required']
  },
  type: {
    type: String,
    enum: ['like', 'comment', 'reply', 'follow', 'mention'],
    required: [true, 'Notification type is required']
  },
  post: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post',
    default: null
  },
  comment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment',
    default: null
  },
  message: {
    type: String,
    required: [true, 'Message is required'],
    maxlength: [200, 'Message cannot exceed 200 characters']
  },
  isRead: {
    type: Boolean,
    default: false
  },
  readAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Index for faster queries
notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, isRead: 1 });
notificationSchema.index({ createdAt: -1 });

// Method to mark as read
notificationSchema.methods.markAsRead = async function() {
  if (!this.isRead) {
    this.isRead = true;
    this.readAt = new Date();
    return this.save();
  }
  return this;
};

// Static method to create notification
notificationSchema.statics.createNotification = async function(data) {
  const { recipient, sender, type, post, comment, message } = data;
  
  // Don't create notification if sender is the recipient
  if (recipient.toString() === sender.toString()) {
    return null;
  }
  
  // Check for duplicate notifications (prevent spam)
  const existingNotification = await this.findOne({
    recipient,
    sender,
    type,
    post: post || null,
    comment: comment || null,
    createdAt: { $gte: new Date(Date.now() - 60000) } // Within last minute
  });
  
  if (existingNotification) {
    return null;
  }
  
  const notification = new this({
    recipient,
    sender,
    type,
    post,
    comment,
    message
  });
  
  await notification.save();
  return notification.populate('sender', 'username avatar');
};

// Static method to get unread count
notificationSchema.statics.getUnreadCount = async function(userId) {
  return await this.countDocuments({
    recipient: userId,
    isRead: false
  });
};

// Static method to get notifications for user
notificationSchema.statics.getForUser = async function(userId, options = {}) {
  const { page = 1, limit = 20, unreadOnly = false } = options;
  const skip = (page - 1) * limit;
  
  const query = { recipient: userId };
  if (unreadOnly) {
    query.isRead = false;
  }
  
  const notifications = await this.find(query)
    .populate('sender', 'username avatar')
    .populate('post', 'content image')
    .populate('comment', 'content')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();
  
  const total = await this.countDocuments(query);
  const unreadCount = await this.getUnreadCount(userId);
  
  return {
    notifications,
    unreadCount,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
      hasMore: page * limit < total
    }
  };
};

// Static method to mark all as read
notificationSchema.statics.markAllAsRead = async function(userId) {
  const result = await this.updateMany(
    { recipient: userId, isRead: false },
    { isRead: true, readAt: new Date() }
  );
  
  return result.modifiedCount;
};

// Static method to delete old read notifications (cleanup)
notificationSchema.statics.cleanupOldNotifications = async function(days = 30) {
  const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  
  const result = await this.deleteMany({
    isRead: true,
    readAt: { $lt: cutoffDate }
  });
  
  return result.deletedCount;
};

module.exports = mongoose.model('Notification', notificationSchema);
