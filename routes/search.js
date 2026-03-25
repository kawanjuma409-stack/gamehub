const express = require('express');
const router = express.Router();
const { User, Post } = require('../models');
const { validateSearch } = require('../middleware/validation');

// @route   GET /api/search
// @desc    Search posts and users
// @access  Public
router.get('/', validateSearch, async (req, res) => {
  try {
    const { q, type = 'all' } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    const results = {
      posts: [],
      users: [],
      postsTotal: 0,
      usersTotal: 0
    };
    
    // Search posts
    if (type === 'all' || type === 'posts') {
      const postsQuery = {
        $and: [
          { isDeleted: false },
          {
            $or: [
              { content: { $regex: q, $options: 'i' } },
              { tags: { $in: [new RegExp(q, 'i')] } }
            ]
          }
        ]
      };
      
      results.posts = await Post.find(postsQuery)
        .populate('author', 'username avatar isOnline')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();
      
      results.postsTotal = await Post.countDocuments(postsQuery);
    }
    
    // Search users
    if (type === 'all' || type === 'users') {
      const usersQuery = {
        $or: [
          { username: { $regex: q, $options: 'i' } },
          { bio: { $regex: q, $options: 'i' } }
        ]
      };
      
      results.users = await User.find(usersQuery)
        .select('-password -email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();
      
      results.usersTotal = await User.countDocuments(usersQuery);
    }
    
    const total = results.postsTotal + results.usersTotal;
    
    res.json({
      success: true,
      data: {
        query: q,
        type,
        posts: results.posts,
        users: results.users,
        pagination: {
          page,
          limit,
          total,
          postsTotal: results.postsTotal,
          usersTotal: results.usersTotal,
          pages: Math.ceil(Math.max(results.postsTotal, results.usersTotal) / limit),
          hasMore: page * limit < Math.max(results.postsTotal, results.usersTotal)
        }
      }
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({
      success: false,
      message: 'Search failed'
    });
  }
});

// @route   GET /api/search/posts
// @desc    Search posts only
// @access  Public
router.get('/posts', validateSearch, async (req, res) => {
  try {
    const { q } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    const postsQuery = {
      $and: [
        { isDeleted: false },
        {
          $or: [
            { content: { $regex: q, $options: 'i' } },
            { tags: { $in: [new RegExp(q, 'i')] } }
          ]
        }
      ]
    };
    
    const posts = await Post.find(postsQuery)
      .populate('author', 'username avatar isOnline')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
    
    const total = await Post.countDocuments(postsQuery);
    
    res.json({
      success: true,
      data: {
        posts,
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
    console.error('Search posts error:', error);
    res.status(500).json({
      success: false,
      message: 'Search failed'
    });
  }
});

// @route   GET /api/search/users
// @desc    Search users only
// @access  Public
router.get('/users', validateSearch, async (req, res) => {
  try {
    const { q } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    const usersQuery = {
      $or: [
        { username: { $regex: q, $options: 'i' } },
        { bio: { $regex: q, $options: 'i' } }
      ]
    };
    
    const users = await User.find(usersQuery)
      .select('-password -email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
    
    const total = await User.countDocuments(usersQuery);
    
    res.json({
      success: true,
      data: {
        users,
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
    console.error('Search users error:', error);
    res.status(500).json({
      success: false,
      message: 'Search failed'
    });
  }
});

// @route   GET /api/search/suggestions
// @desc    Get search suggestions (autocomplete)
// @access  Public
router.get('/suggestions', async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || q.length < 2) {
      return res.json({
        success: true,
        data: { suggestions: [] }
      });
    }
    
    // Search users for suggestions
    const users = await User.find({
      username: { $regex: '^' + q, $options: 'i' }
    })
      .select('username avatar')
      .limit(5)
      .lean();
    
    // Search tags for suggestions
    const tags = await Post.aggregate([
      { $match: { isDeleted: false, tags: { $in: [new RegExp(q, 'i')] } } },
      { $unwind: '$tags' },
      { $match: { tags: { $regex: q, $options: 'i' } } },
      { $group: { _id: '$tags', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);
    
    const suggestions = [
      ...users.map(u => ({ type: 'user', value: u.username, avatar: u.avatar })),
      ...tags.map(t => ({ type: 'tag', value: t._id, count: t.count }))
    ];
    
    res.json({
      success: true,
      data: { suggestions }
    });
  } catch (error) {
    console.error('Search suggestions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get suggestions'
    });
  }
});

module.exports = router;
