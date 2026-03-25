const validator = require('validator');

// Validation error helper
const validationError = (res, message, field = null) => {
  return res.status(400).json({
    success: false,
    message: 'Validation error',
    errors: field ? [{ field, message }] : [message]
  });
};

// Validate registration input
const validateRegister = (req, res, next) => {
  const { username, email, password, confirmPassword } = req.body;
  const errors = [];
  
  // Username validation
  if (!username || validator.isEmpty(username.trim())) {
    errors.push({ field: 'username', message: 'Username is required' });
  } else if (!validator.isLength(username.trim(), { min: 3, max: 20 })) {
    errors.push({ field: 'username', message: 'Username must be 3-20 characters' });
  } else if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    errors.push({ field: 'username', message: 'Username can only contain letters, numbers, and underscores' });
  }
  
  // Email validation
  if (!email || validator.isEmpty(email.trim())) {
    errors.push({ field: 'email', message: 'Email is required' });
  } else if (!validator.isEmail(email)) {
    errors.push({ field: 'email', message: 'Please enter a valid email address' });
  }
  
  // Password validation
  if (!password) {
    errors.push({ field: 'password', message: 'Password is required' });
  } else if (!validator.isLength(password, { min: 6 })) {
    errors.push({ field: 'password', message: 'Password must be at least 6 characters' });
  } else if (!validator.isStrongPassword(password, { 
    minLength: 6, 
    minLowercase: 1, 
    minUppercase: 0, 
    minNumbers: 0, 
    minSymbols: 0 
  })) {
    errors.push({ field: 'password', message: 'Password must contain at least one lowercase letter' });
  }
  
  // Confirm password validation
  if (confirmPassword !== undefined && password !== confirmPassword) {
    errors.push({ field: 'confirmPassword', message: 'Passwords do not match' });
  }
  
  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors
    });
  }
  
  // Sanitize inputs
  req.body.username = validator.escape(username.trim());
  req.body.email = validator.normalizeEmail(email.trim());
  
  next();
};

// Validate login input
const validateLogin = (req, res, next) => {
  const { email, password } = req.body;
  const errors = [];
  
  if (!email || validator.isEmpty(email.trim())) {
    errors.push({ field: 'email', message: 'Email is required' });
  }
  
  if (!password) {
    errors.push({ field: 'password', message: 'Password is required' });
  }
  
  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors
    });
  }
  
  // Sanitize email
  if (email) {
    req.body.email = validator.normalizeEmail(email.trim());
  }
  
  next();
};

// Validate post creation/update
const validatePost = (req, res, next) => {
  const { content, tags } = req.body;
  const errors = [];
  
  // Content validation
  if (!content || validator.isEmpty(content.trim())) {
    errors.push({ field: 'content', message: 'Post content is required' });
  } else if (!validator.isLength(content.trim(), { max: 2000 })) {
    errors.push({ field: 'content', message: 'Post cannot exceed 2000 characters' });
  }
  
  // Tags validation (optional)
  if (tags) {
    let tagsArray = tags;
    if (typeof tags === 'string') {
      try {
        tagsArray = JSON.parse(tags);
      } catch {
        tagsArray = tags.split(',').map(t => t.trim()).filter(t => t);
      }
    }
    
    if (!Array.isArray(tagsArray)) {
      errors.push({ field: 'tags', message: 'Tags must be an array' });
    } else if (tagsArray.length > 5) {
      errors.push({ field: 'tags', message: 'Maximum 5 tags allowed' });
    } else {
      for (const tag of tagsArray) {
        if (!validator.isLength(tag, { max: 30 })) {
          errors.push({ field: 'tags', message: 'Each tag cannot exceed 30 characters' });
          break;
        }
      }
    }
    
    req.body.tags = tagsArray;
  }
  
  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors
    });
  }
  
  // Sanitize content (allow some HTML or use plain text)
  req.body.content = validator.escape(content.trim());
  
  next();
};

// Validate comment creation/update
const validateComment = (req, res, next) => {
  const { content } = req.body;
  const errors = [];
  
  if (!content || validator.isEmpty(content.trim())) {
    errors.push({ field: 'content', message: 'Comment content is required' });
  } else if (!validator.isLength(content.trim(), { max: 1000 })) {
    errors.push({ field: 'content', message: 'Comment cannot exceed 1000 characters' });
  }
  
  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors
    });
  }
  
  // Sanitize content
  req.body.content = validator.escape(content.trim());
  
  next();
};

// Validate profile update
const validateProfileUpdate = (req, res, next) => {
  const { username, bio } = req.body;
  const errors = [];
  
  // Username validation (optional update)
  if (username !== undefined) {
    if (validator.isEmpty(username.trim())) {
      errors.push({ field: 'username', message: 'Username cannot be empty' });
    } else if (!validator.isLength(username.trim(), { min: 3, max: 20 })) {
      errors.push({ field: 'username', message: 'Username must be 3-20 characters' });
    } else if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      errors.push({ field: 'username', message: 'Username can only contain letters, numbers, and underscores' });
    }
    
    req.body.username = validator.escape(username.trim());
  }
  
  // Bio validation (optional)
  if (bio !== undefined) {
    if (!validator.isLength(bio, { max: 500 })) {
      errors.push({ field: 'bio', message: 'Bio cannot exceed 500 characters' });
    }
    req.body.bio = validator.escape(bio);
  }
  
  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors
    });
  }
  
  next();
};

// Validate search query
const validateSearch = (req, res, next) => {
  const { q, type } = req.query;
  const errors = [];
  
  if (!q || validator.isEmpty(q.trim())) {
    errors.push({ field: 'q', message: 'Search query is required' });
  } else if (!validator.isLength(q.trim(), { min: 2, max: 100 })) {
    errors.push({ field: 'q', message: 'Search query must be 2-100 characters' });
  }
  
  if (type && !['posts', 'users', 'all'].includes(type)) {
    errors.push({ field: 'type', message: 'Invalid search type' });
  }
  
  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors
    });
  }
  
  // Sanitize query
  req.query.q = validator.escape(q.trim());
  
  next();
};

// Sanitize HTML content (basic)
const sanitizeContent = (content) => {
  if (!content) return '';
  
  // Remove script tags and event handlers
  let sanitized = content
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .replace(/javascript:/gi, '');
  
  // Escape remaining HTML
  sanitized = validator.escape(sanitized);
  
  return sanitized;
};

module.exports = {
  validationError,
  validateRegister,
  validateLogin,
  validatePost,
  validateComment,
  validateProfileUpdate,
  validateSearch,
  sanitizeContent
};
