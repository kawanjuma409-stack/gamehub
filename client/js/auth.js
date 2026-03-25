// Authentication State Management

const Auth = {
  // Get token from storage
  getToken() {
    return localStorage.getItem('token');
  },

  // Get user from storage
  getUser() {
    const userJson = localStorage.getItem('user');
    return userJson ? JSON.parse(userJson) : null;
  },

  // Check if user is logged in
  isLoggedIn() {
    return !!this.getToken() && !!this.getUser();
  },

  // Set authentication data
  setAuth(token, user) {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
  },

  // Clear authentication data
  clearAuth() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  // Logout
  async logout() {
    try {
      // Call logout API
      await API.auth.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear local storage regardless of API response
      this.clearAuth();
    }
  },

  // Update user data
  updateUser(userData) {
    const currentUser = this.getUser();
    if (currentUser) {
      const updatedUser = { ...currentUser, ...userData };
      localStorage.setItem('user', JSON.stringify(updatedUser));
    }
  },

  // Check if current user owns a resource
  isOwner(resourceUserId) {
    const user = this.getUser();
    return user && user.id === resourceUserId;
  },

  // Get authorization header
  getAuthHeader() {
    const token = this.getToken();
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  }
};
