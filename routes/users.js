const express = require('express');
const router = express.Router();
const { User, Post, Comment } = require('../models');
const { authenticate, checkOwnership } = require('../middleware/auth');
const { validateProfileUpdate } = require('../middleware/validation');
const { upload, setUploadType, handleUploadError, deleteFile, getFilenameFromUrl } = require('../middleware/upload');

// @route   GET /api/users/:username
// @desc    Get user profile by username
// @access  Public
router.get('/:username', async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username })
      .select('-password -email')
      .populate('followers', 'username avatar')
      .populate('following', 'username avatar');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Get recent posts
    const recentPosts = await Post.find({ author: user._id, isDeleted: false })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('author', 'username avatar')
      .lean();
    
    res.json({
      success: true,
      data: {
        user: {
          ...user.toObject(),
          recentPosts
        }
      }
    });
  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user profile'
    });
  }
});

// @route   GET /api/users/id/:id
// @desc    Get user profile by ID
// @access  Public
router.get('/id/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password -email')
      .populate('followers', 'username avatar')
      .populate('following', 'username avatar');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    res.json({
      success: true,
      data: { user }
    });
  } catch (error) {
    console.error('Get user by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user'
    });
  }
});

// @route   PUT /api/users/profile
// @desc    Update current user profile
// @access  Private
router.put('/profile',
  authenticate,
  setUploadType('avatar'),
  upload.single('avatar'),
  handleUploadError,
  validateProfileUpdate,
  async (req, res) => {
    try {
      const { username, bio, removeAvatar } = req.body;
      const user = req.user;
      
      // Check if username is already taken
      if (username && username !== user.username) {
        const existingUser = await User.findOne({ username });
        if (existingUser) {
          return res.status(409).json({
            success: false,
            message: 'Username is already taken',
            field: 'username'
          });
        }
        user.username = username;
      }
      
      // Update bio
      if (bio !== undefined) {
        user.bio = bio;
      }
      
      // Handle avatar update
      if (removeAvatar === 'true' && user.avatar) {
        const oldFilename = getFilenameFromUrl(user.avatar);
        if (oldFilename) {
          await deleteFile(oldFilename, 'avatar');
        }
        user.avatar = null;
      }
      
      if (req.file) {
        // Delete old avatar if exists
        if (user.avatar) {
          const oldFilename = getFilenameFromUrl(user.avatar);
          if (oldFilename) {
            await deleteFile(oldFilename, 'avatar');
          }
        }
        user.avatar = `/uploads/avatars/${req.file.filename}`;
      }
      
      await user.save();
      
      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: {
          user: {
            id: user._id,
            username: user.username,
            email: user.email,
            avatar: user.avatar,
            bio: user.bio,
            role: user.role,
            isOnline: user.isOnline,
            followersCount: user.followers.length,
            followingCount: user.following.length,
            postsCount: user.postsCount
          }
        }
      });
    } catch (error) {
      console.error('Update profile error:', error);
      
      // Delete uploaded avatar if update fails
      if (req.file) {
        await deleteFile(req.file.filename, 'avatar');
      }
      
      res.status(500).json({
        success: false,
        message: 'Failed to update profile'
      });
    }
  }
);

// @route   POST /api/users/:id/follow
// @desc    Follow/unfollow a user
// @access  Private
router.post('/:id/follow', authenticate, async (req, res) => {
  try {
    // Prevent self-follow
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot follow yourself'
      });
    }
    
    const targetUser = await User.findById(req.params.id);
    
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    const currentUser = await User.findById(req.user._id);
    const isFollowing = currentUser.following.includes(targetUser._id);
    
    if (isFollowing) {
      // Unfollow
      currentUser.following = currentUser.following.filter(
        id => id.toString() !== targetUser._id.toString()
      );
      targetUser.followers = targetUser.followers.filter(
        id => id.toString() !== currentUser._id.toString()
      );
      
      await currentUser.save();
      await targetUser.save();
      
      res.json({
        success: true,
        message: `Unfollowed ${targetUser.username}`,
        data: { following: false }
      });
    } else {
      // Follow
      currentUser.following.push(targetUser._id);
      targetUser.followers.push(currentUser._id);
      
      await currentUser.save();
      await targetUser.save();
      
      // Create notification
      const { Notification } = require('../models');
      await Notification.createNotification({
        recipient: targetUser._id,
        sender: currentUser._id,
        type: 'follow',
        message: `${currentUser.username} started following you`
      });
      
      res.json({
        success: true,
        message: `Following ${targetUser.username}`,
        data: { following: true }
      });
    }
  } catch (error) {
    console.error('Follow user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process follow request'
    });
  }
});

// @route   GET /api/users/:id/followers
// @desc    Get user's followers
// @access  Public
router.get('/:id/followers', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    const user = await User.findById(req.params.id)
      .populate({
        path: 'followers',
        select: 'username avatar bio isOnline',
        options: { skip, limit }
      });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    const total = user.followers.length;
    
    res.json({
      success: true,
      data: {
        followers: user.followers,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
          hasMore: page * limit < total
        }
      }
    });
  } catch (error) {
    console.error('Get followers error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch followers'
    });
  }
});

// @route   GET /api/users/:id/following
// @desc    Get users that a user is following
// @access  Public
router.get('/:id/following', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    const user = await User.findById(req.params.id)
      .populate({
        path: 'following',
        select: 'username avatar bio isOnline',
        options: { skip, limit }
      });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    const total = user.following.length;
    
    res.json({
      success: true,
      data: {
        following: user.following,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
          hasMore: page * limit < total
        }
      }
    });
  } catch (error) {
    console.error('Get following error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch following'
    });
  }
});

// @route   GET /api/users/:id/posts
// @desc    Get posts by user
// @access  Public
router.get('/:id/posts', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    
    const result = await Post.getByUser(req.params.id, { page, limit });
    
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

// @route   GET /api/users/:id/comments
// @desc    Get comments by user
// @access  Public
router.get('/:id/comments', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    
    const result = await Comment.getByUser(req.params.id, { page, limit });
    
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
