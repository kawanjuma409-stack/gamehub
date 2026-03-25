// API Client

const API = {
  // Base request function
  async request(endpoint, options = {}) {
    const url = `${API_BASE_URL}/${API_VERSION}${endpoint}`;
    
    // Default headers
    const headers = {
      'Accept': 'application/json',
      ...options.headers
    };
    
    // Add auth token if available
    const token = localStorage.getItem('token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    // Don't set Content-Type for FormData (browser will set it with boundary)
    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }
    
    const config = {
      ...options,
      headers
    };
    
    try {
      const response = await fetch(url, config);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Request failed');
      }
      
      return data;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  },

  // Authentication
  auth: {
    async register(userData) {
      return API.request('/auth/register', {
        method: 'POST',
        body: JSON.stringify(userData)
      });
    },
    
    async login(credentials) {
      return API.request('/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials)
      });
    },
    
    async logout() {
      return API.request('/auth/logout', {
        method: 'POST'
      });
    },
    
    async getMe() {
      return API.request('/auth/me');
    },
    
    async refreshToken() {
      return API.request('/auth/refresh', {
        method: 'POST'
      });
    }
  },

  // Posts
  posts: {
    async getAll(options = {}) {
      const { page = 1, limit = 10 } = options;
      return API.request(`/posts?page=${page}&limit=${limit}`);
    },
    
    async getById(id) {
      return API.request(`/posts/${id}`);
    },
    
    async create(data) {
      const formData = new FormData();
      formData.append('content', data.content);
      
      if (data.tags && data.tags.length > 0) {
        formData.append('tags', JSON.stringify(data.tags));
      }
      
      if (data.image) {
        formData.append('image', data.image);
      }
      
      return API.request('/posts', {
        method: 'POST',
        body: formData
      });
    },
    
    async update(id, data) {
      const formData = new FormData();
      formData.append('content', data.content);
      
      if (data.removeImage) {
        formData.append('removeImage', 'true');
      }
      
      if (data.image) {
        formData.append('image', data.image);
      }
      
      return API.request(`/posts/${id}`, {
        method: 'PUT',
        body: formData
      });
    },
    
    async delete(id) {
      return API.request(`/posts/${id}`, {
        method: 'DELETE'
      });
    },
    
    async like(id) {
      return API.request(`/posts/${id}/like`, {
        method: 'POST'
      });
    },
    
    async getByUser(userId, options = {}) {
      const { page = 1, limit = 10 } = options;
      return API.request(`/posts/user/${userId}?page=${page}&limit=${limit}`);
    },
    
    async getTrendingTags() {
      return API.request('/posts/trending/tags');
    }
  },

  // Comments
  comments: {
    async getByPost(postId, options = {}) {
      const { page = 1, limit = 20, sortBy = 'newest' } = options;
      return API.request(`/comments/post/${postId}?page=${page}&limit=${limit}&sort=${sortBy}`);
    },
    
    async getById(id) {
      return API.request(`/comments/${id}`);
    },
    
    async create(data) {
      return API.request('/comments', {
        method: 'POST',
        body: JSON.stringify(data)
      });
    },
    
    async update(id, data) {
      return API.request(`/comments/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      });
    },
    
    async delete(id) {
      return API.request(`/comments/${id}`, {
        method: 'DELETE'
      });
    },
    
    async like(id) {
      return API.request(`/comments/${id}/like`, {
        method: 'POST'
      });
    },
    
    async getByUser(userId, options = {}) {
      const { page = 1, limit = 20 } = options;
      return API.request(`/comments/user/${userId}?page=${page}&limit=${limit}`);
    }
  },

  // Notifications
  notifications: {
    async getAll(options = {}) {
      const { page = 1, limit = 20, unreadOnly = false } = options;
      let url = `/notifications?page=${page}&limit=${limit}`;
      if (unreadOnly) url += '&unread=true';
      return API.request(url);
    },
    
    async getUnreadCount() {
      return API.request('/notifications/unread-count');
    },
    
    async markAsRead(id) {
      return API.request(`/notifications/${id}/read`, {
        method: 'PUT'
      });
    },
    
    async markAllRead() {
      return API.request('/notifications/read-all', {
        method: 'PUT'
      });
    },
    
    async delete(id) {
      return API.request(`/notifications/${id}`, {
        method: 'DELETE'
      });
    }
  },

  // Users
  users: {
    async getByUsername(username) {
      return API.request(`/users/${username}`);
    },
    
    async getById(id) {
      return API.request(`/users/id/${id}`);
    },
    
    async updateProfile(data) {
      const formData = new FormData();
      
      if (data.username) formData.append('username', data.username);
      if (data.bio !== undefined) formData.append('bio', data.bio);
      if (data.removeAvatar) formData.append('removeAvatar', 'true');
      if (data.avatar) formData.append('avatar', data.avatar);
      
      return API.request('/users/profile', {
        method: 'PUT',
        body: formData
      });
    },
    
    async follow(id) {
      return API.request(`/users/${id}/follow`, {
        method: 'POST'
      });
    },
    
    async getFollowers(id, options = {}) {
      const { page = 1, limit = 20 } = options;
      return API.request(`/users/${id}/followers?page=${page}&limit=${limit}`);
    },
    
    async getFollowing(id, options = {}) {
      const { page = 1, limit = 20 } = options;
      return API.request(`/users/${id}/following?page=${page}&limit=${limit}`);
    },
    
    async getPosts(id, options = {}) {
      const { page = 1, limit = 10 } = options;
      return API.request(`/users/${id}/posts?page=${page}&limit=${limit}`);
    },
    
    async getComments(id, options = {}) {
      const { page = 1, limit = 20 } = options;
      return API.request(`/users/${id}/comments?page=${page}&limit=${limit}`);
    }
  },

  // Search
  search: {
    async all(query, options = {}) {
      const { page = 1, limit = 10, type = 'all' } = options;
      return API.request(`/search?q=${encodeURIComponent(query)}&type=${type}&page=${page}&limit=${limit}`);
    },
    
    async posts(query, options = {}) {
      const { page = 1, limit = 10 } = options;
      return API.request(`/search/posts?q=${encodeURIComponent(query)}&page=${page}&limit=${limit}`);
    },
    
    async users(query, options = {}) {
      const { page = 1, limit = 10 } = options;
      return API.request(`/search/users?q=${encodeURIComponent(query)}&page=${page}&limit=${limit}`);
    },
    
    async suggestions(query) {
      return API.request(`/search/suggestions?q=${encodeURIComponent(query)}`);
    }
  }
};
