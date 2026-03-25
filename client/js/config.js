// API Configuration
const API_BASE_URL = 'http://localhost:5000';
const API_VERSION = 'api';

// App Configuration
const APP_CONFIG = {
  name: 'GameHub',
  version: '1.0.0',
  defaultAvatar: '/assets/default-avatar.png',
  maxFileSize: 5 * 1024 * 1024, // 5MB
  postsPerPage: 10,
  commentsPerPage: 20
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { API_BASE_URL, API_VERSION, APP_CONFIG };
}
