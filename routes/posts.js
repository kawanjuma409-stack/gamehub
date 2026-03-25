const express = require('express');
const router = express.Router();
const { Post, User, Notification } = require('../models');
const { authenticate, optionalAuth, checkOwnership } = require('../middleware/auth');
const { validatePost } = require('../middleware/validation');
const { upload, setUploadType, handleUploadError, deleteFile, getFilenameFromUrl } = require('../middleware/upload');

// @route   GET /api/posts
// @desc    Get all posts (feed)
// @access  Public/Private
router.get('/', optionalAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const userId = req.user ? req.user._id : null;
    
    const result = await Post.getFeed({ page, limit, userId });
    
    // Check if current user has liked each post
    if (req.user) {
      result.posts = result.posts.map(post => ({
        ...post,
        isLiked: post.likes.some(like => like.toString() === req.user._id.toString())
      }));
    }
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Get posts error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch posts'
    });
  }
});

// @route   GET /api/posts/:id
// @desc    Get single post by ID
// @access  Public/Private
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate('author', 'username avatar bio isOnline createdAt')
      .populate({
        path: 'comments',
        populate: {
          path: 'author',
          select: 'username avatar'
        },
        match: { isDeleted: false, parentComment: null },
        options: { limit: 5, sort: { createdAt: -1 } }
      });
    
    if (!post || post.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }
    
    // Increment view count
    await post.incrementViews();
    
    // Check if current user has liked the post
    let isLiked = false;
    let isOwner = false;
    
    if (req.user) {
      isLiked = post.likes.some(like => like.toString() === req.user._id.toString());
      isOwner = post.author._id.toString() === req.user._id.toString();
    }
    
    res.json({
      success: true,
      data: {
        post: {
          ...post.toObject(),
          isLiked,
          isOwner
        }
      }
    });
  } catch (error) {
    console.error('Get post error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch post'
    });
  }
});

// @route   POST /api/posts
// @desc    Create a new post
// @access  Private
router.post('/',
  authenticate,
  setUploadType('post'),
  upload.single('image'),
  handleUploadError,
  validatePost,
  async (req, res) => {
    try {
      const { content, tags } = req.body;
      
      // Create post
      const post = new Post({
        author: req.user._id,
        content,
        tags: tags || [],
        image: req.file ? `/uploads/posts/${req.file.filename}` : null
      });
      
      await post.save();
      
      // Update user's post count
      await User.findByIdAndUpdate(req.user._id, { $inc: { postsCount: 1 } });
      
      // Populate author info
      await post.populate('author', 'username avatar isOnline');
      
      res.status(201).json({
        success: true,
        message: 'Post created successfully',
        data: { post }
      });
    } catch (error) {
      console.error('Create post error:', error);
      
      // Delete uploaded image if post creation fails
      if (req.file) {
        await deleteFile(req.file.filename, 'post');
      }
      
      res.status(500).json({
        success: false,
        message: 'Failed to create post'
      });
    }
  }
);

// @route   PUT /api/posts/:id
// @desc    Update a post
// @access  Private (owner only)
router.put('/:id',
  authenticate,
  checkOwnership('Post', 'id'),
  setUploadType('post'),
  upload.single('image'),
  handleUploadError,
  validatePost,
  async (req, res) => {
    try {
      const { content, tags, removeImage } = req.body;
      const post = req.resource;
      
      // Update fields
      post.content = content;
      post.tags = tags || [];
      post.isEdited = true;
      post.editedAt = new Date();
      
      // Handle image update
      if (removeImage === 'true' && post.image) {
        // Delete old image
        const oldFilename = getFilenameFromUrl(post.image);
        if (oldFilename) {
          await deleteFile(oldFilename, 'post');
        }
        post.image = null;
      }
      
      if (req.file) {
        // Delete old image if exists
        if (post.image) {
          const oldFilename = getFilenameFromUrl(post.image);
          if (oldFilename) {
            await deleteFile(oldFilename, 'post');
          }
        }
        post.image = `/uploads/posts/${req.file.filename}`;
      }
      
      await post.save();
      await post.populate('author', 'username avatar isOnline');
      
      res.json({
        success: true,
        message: 'Post updated successfully',
        data: { post }
      });
    } catch (error) {
      console.error('Update post error:', error);
      
      // Delete uploaded image if update fails
      if (req.file) {
        await deleteFile(req.file.filename, 'post');
      }
      
      res.status(500).json({
        success: false,
        message: 'Failed to update post'
      });
    }
  }
);

// @route   DELETE /api/posts/:id
// @desc    Delete a post (soft delete)
// @access  Private (owner or admin)
router.delete('/:id', authenticate, checkOwnership('Post', 'id'), async (req, res) => {
  try {
    const post = req.resource;
    
    // Soft delete
    await post.softDelete();
    
    // Update user's post count
    await User.findByIdAndUpdate(post.author, { $inc: { postsCount: -1 } });
    
    res.json({
      success: true,
      message: 'Post deleted successfully'
    });
  } catch (error) {
    console.error('Delete post error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete post'
    });
  }
});

// @route   POST /api/posts/:id/like
// @desc    Like/unlike a post
// @access  Private
router.post('/:id/like', authenticate, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    
    if (!post || post.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }
    
    const userId = req.user._id;
    const hasLiked = post.likes.includes(userId);
    
    if (hasLiked) {
      // Unlike
      post.likes = post.likes.filter(id => id.toString() !== userId.toString());
      post.likesCount = Math.max(0, post.likesCount - 1);
      
      // Remove from user's liked posts
      await User.findByIdAndUpdate(userId, {
        $pull: { likedPosts: post._id }
      });
      
      await post.save();
      
      res.json({
        success: true,
        message: 'Post unliked',
        data: { liked: false, likesCount: post.likesCount }
      });
    } else {
      // Like
      post.likes.push(userId);
      post.likesCount += 1;
      
      // Add to user's liked posts
      await User.findByIdAndUpdate(userId, {
        $addToSet: { likedPosts: post._id }
      });
      
      await post.save();
      
      // Create notification for post author (if not self)
      if (post.author.toString() !== userId.toString()) {
        await Notification.createNotification({
          recipient: post.author,
          sender: userId,
          type: 'like',
          post: post._id,
          message: `${req.user.username} liked your post`
        });
      }
      
      res.json({
        success: true,
        message: 'Post liked',
        data: { liked: true, likesCount: post.likesCount }
      });
    }
  } catch (error) {
    console.error('Like post error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process like'
    });
  }
});

// @route   GET /api/posts/user/:userId
// @desc    Get posts by a specific user
// @access  Public/Private
router.get('/user/:userId', optionalAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    
    const result = await Post.getByUser(userId, { page, limit });
    
    // Check if current user has liked each post
    if (req.user) {
      result.posts = result.posts.map(post => ({
        ...post,
        isLiked: post.likes.some(like => like.toString() === req.user._id.toString()),
        isOwner: post.author._id.toString() === req.user._id.toString()
      }));
    }
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Get user posts error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user posts'
    });
  }
});

// @route   GET /api/posts/trending/tags
// @desc    Get trending tags
// @access  Public
router.get('/trending/tags', async (req, res) => {
  try {
    const tags = await Post.aggregate([
      { $match: { isDeleted: false } },
      { $unwind: '$tags' },
      { $group: { _id: '$tags', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);
    
    res.json({
      success: true,
      data: { tags: tags.map(t => ({ name: t._id, count: t.count })) }
    });
  } catch (error) {
    console.error('Get trending tags error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch trending tags'
    });
  }
});

module.exports = router;
