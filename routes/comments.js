const express = require('express');
const router = express.Router();
const { Comment, Post, Notification } = require('../models');
const { authenticate, checkOwnership } = require('../middleware/auth');
const { validateComment } = require('../middleware/validation');

// @route   GET /api/comments/post/:postId
// @desc    Get comments for a post
// @access  Public/Private
router.get('/post/:postId', async (req, res) => {
  try {
    const { postId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const sortBy = req.query.sort || 'newest';
    
    const result = await Comment.getByPost(postId, { page, limit, sortBy });
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch comments'
    });
  }
});

// @route   GET /api/comments/:id
// @desc    Get a single comment
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id)
      .populate('author', 'username avatar isOnline')
      .populate('post', 'content author')
      .populate({
        path: 'replies',
        populate: {
          path: 'author',
          select: 'username avatar'
        },
        match: { isDeleted: false }
      });
    
    if (!comment || comment.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found'
      });
    }
    
    res.json({
      success: true,
      data: { comment }
    });
  } catch (error) {
    console.error('Get comment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch comment'
    });
  }
});

// @route   POST /api/comments
// @desc    Create a new comment
// @access  Private
router.post('/', authenticate, validateComment, async (req, res) => {
  try {
    const { postId, content, parentCommentId } = req.body;
    
    // Check if post exists
    const post = await Post.findById(postId);
    if (!post || post.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }
    
    // Create comment
    const comment = new Comment({
      post: postId,
      author: req.user._id,
      content,
      parentComment: parentCommentId || null
    });
    
    await comment.save();
    
    // If it's a reply, add to parent comment's replies
    if (parentCommentId) {
      const parentComment = await Comment.findById(parentCommentId);
      if (parentComment) {
        await parentComment.addReply(comment._id);
        
        // Notify parent comment author
        if (parentComment.author.toString() !== req.user._id.toString()) {
          await Notification.createNotification({
            recipient: parentComment.author,
            sender: req.user._id,
            type: 'reply',
            post: postId,
            comment: comment._id,
            message: `${req.user.username} replied to your comment`
          });
        }
      }
    } else {
      // Notify post author of new comment (if not self)
      if (post.author.toString() !== req.user._id.toString()) {
        await Notification.createNotification({
          recipient: post.author,
          sender: req.user._id,
          type: 'comment',
          post: postId,
          comment: comment._id,
          message: `${req.user.username} commented on your post`
        });
      }
    }
    
    // Populate author info
    await comment.populate('author', 'username avatar isOnline');
    
    res.status(201).json({
      success: true,
      message: 'Comment created successfully',
      data: { comment }
    });
  } catch (error) {
    console.error('Create comment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create comment'
    });
  }
});

// @route   PUT /api/comments/:id
// @desc    Update a comment
// @access  Private (owner only)
router.put('/:id', authenticate, checkOwnership('Comment', 'id'), validateComment, async (req, res) => {
  try {
    const { content } = req.body;
    const comment = req.resource;
    
    // Update fields
    comment.content = content;
    comment.isEdited = true;
    comment.editedAt = new Date();
    
    await comment.save();
    await comment.populate('author', 'username avatar isOnline');
    
    res.json({
      success: true,
      message: 'Comment updated successfully',
      data: { comment }
    });
  } catch (error) {
    console.error('Update comment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update comment'
    });
  }
});

// @route   DELETE /api/comments/:id
// @desc    Delete a comment (soft delete)
// @access  Private (owner or admin)
router.delete('/:id', authenticate, checkOwnership('Comment', 'id'), async (req, res) => {
  try {
    const comment = req.resource;
    
    // Soft delete
    await comment.softDelete();
    
    // Decrement post comment count
    await Post.findByIdAndUpdate(comment.post, {
      $inc: { commentsCount: -1 }
    });
    
    res.json({
      success: true,
      message: 'Comment deleted successfully'
    });
  } catch (error) {
    console.error('Delete comment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete comment'
    });
  }
});

// @route   POST /api/comments/:id/like
// @desc    Like/unlike a comment
// @access  Private
router.post('/:id/like', authenticate, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    
    if (!comment || comment.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found'
      });
    }
    
    const userId = req.user._id;
    const hasLiked = comment.likes.includes(userId);
    
    if (hasLiked) {
      // Unlike
      comment.likes = comment.likes.filter(id => id.toString() !== userId.toString());
      comment.likesCount = Math.max(0, comment.likesCount - 1);
      await comment.save();
      
      res.json({
        success: true,
        message: 'Comment unliked',
        data: { liked: false, likesCount: comment.likesCount }
      });
    } else {
      // Like
      comment.likes.push(userId);
      comment.likesCount += 1;
      await comment.save();
      
      // Notify comment author (if not self)
      if (comment.author.toString() !== userId.toString()) {
        await Notification.createNotification({
          recipient: comment.author,
          sender: userId,
          type: 'like',
          post: comment.post,
          comment: comment._id,
          message: `${req.user.username} liked your comment`
        });
      }
      
      res.json({
        success: true,
        message: 'Comment liked',
        data: { liked: true, likesCount: comment.likesCount }
      });
    }
  } catch (error) {
    console.error('Like comment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process like'
    });
  }
});

// @route   GET /api/comments/user/:userId
// @desc    Get comments by a specific user
// @access  Public
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    
    const result = await Comment.getByUser(userId, { page, limit });
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Get user comments error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user comments'
    });
  }
});

module.exports = router;
