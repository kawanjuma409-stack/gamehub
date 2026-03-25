// Utility Functions

/**
 * Format date to relative time (e.g., "2 hours ago")
 */
function formatTimeAgo(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);
  
  if (seconds < 60) return 'just now';
  
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks}w ago`;
  
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  
  const years = Math.floor(days / 365);
  return `${years}y ago`;
}

/**
 * Format date to locale string
 */
function formatDate(dateString, options = {}) {
  const date = new Date(dateString);
  const defaultOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  };
  return date.toLocaleDateString('en-US', { ...defaultOptions, ...options });
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Truncate text to specified length
 */
function truncateText(text, maxLength = 100, suffix = '...') {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + suffix;
}

/**
 * Debounce function
 */
function debounce(func, wait = 300) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function
 */
function throttle(func, limit = 300) {
  let inThrottle;
  return function executedFunction(...args) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * Show toast notification
 */
function showToast(message, type = 'info', duration = 3000) {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  const iconMap = {
    success: 'fa-check-circle',
    error: 'fa-exclamation-circle',
    warning: 'fa-exclamation-triangle',
    info: 'fa-info-circle'
  };
  
  toast.innerHTML = `
    <i class="fas ${iconMap[type] || 'fa-info-circle'}"></i>
    <span>${escapeHtml(message)}</span>
  `;
  
  container.appendChild(toast);
  
  // Remove after duration
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

/**
 * Initialize navigation based on auth state
 */
function initNavigation() {
  const isLoggedIn = Auth.isLoggedIn();
  const user = isLoggedIn ? Auth.getUser() : null;
  
  // Update nav auth section
  const navAuth = document.getElementById('navAuth');
  const navUser = document.getElementById('navUser');
  
  if (navAuth && navUser) {
    if (isLoggedIn) {
      navAuth.style.display = 'none';
      navUser.style.display = 'block';
      
      // Update user info
      const navAvatar = document.getElementById('navAvatar');
      const navUsername = document.getElementById('navUsername');
      
      if (navAvatar) navAvatar.src = user.avatar || '../assets/default-avatar.png';
      if (navUsername) navUsername.textContent = user.username;
    } else {
      navAuth.style.display = 'flex';
      navUser.style.display = 'none';
    }
  }
  
  // Setup logout button
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      Auth.logout();
      window.location.href = '/';
    });
  }
  
  // Setup mobile nav toggle
  const navToggle = document.getElementById('navToggle');
  const navLinks = document.getElementById('navLinks');
  
  if (navToggle && navLinks) {
    navToggle.addEventListener('click', () => {
      navLinks.classList.toggle('show');
    });
  }
  
  // Setup search
  const searchInput = document.getElementById('searchInput');
  const searchBtn = document.getElementById('searchBtn');
  
  if (searchInput && searchBtn) {
    const performSearch = () => {
      const query = searchInput.value.trim();
      if (query) {
        window.location.href = `pages/search.html?q=${encodeURIComponent(query)}`;
      }
    };
    
    searchBtn.addEventListener('click', performSearch);
    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') performSearch();
    });
  }
  
  // Update notification badge
  if (isLoggedIn) {
    updateNotificationBadge();
  }
}

/**
 * Update notification badge count
 */
async function updateNotificationBadge() {
  try {
    const result = await API.notifications.getUnreadCount();
    if (result.success) {
      const badge = document.getElementById('notificationBadge');
      if (badge) {
        if (result.data.count > 0) {
          badge.textContent = result.data.count > 99 ? '99+' : result.data.count;
          badge.style.display = 'flex';
        } else {
          badge.style.display = 'none';
        }
      }
    }
  } catch (error) {
    console.error('Update notification badge error:', error);
  }
}

/**
 * Create post HTML element
 */
function createPostHTML(post) {
  const timeAgo = formatTimeAgo(post.createdAt);
  const isLiked = post.isLiked || false;
  const isOwner = post.isOwner || false;
  
  return `
    <article class="post" data-id="${post._id}">
      <div class="post-header">
        <a href="pages/profile.html?user=${post.author.username}" class="post-author">
          <img src="${post.author.avatar || 'assets/default-avatar.png'}" alt="${post.author.username}" class="author-avatar">
          <div class="author-info">
            <span class="author-name">${escapeHtml(post.author.username)}</span>
            <span class="post-time">${timeAgo}</span>
          </div>
        </a>
        ${isOwner ? `
          <div class="post-menu">
            <button class="menu-btn"><i class="fas fa-ellipsis-h"></i></button>
            <div class="menu-dropdown">
              <a href="#" class="edit-post"><i class="fas fa-edit"></i> Edit</a>
              <a href="#" class="delete-post"><i class="fas fa-trash"></i> Delete</a>
            </div>
          </div>
        ` : ''}
      </div>
      <div class="post-content">
        <p>${escapeHtml(post.content)}</p>
        ${post.image ? `<img src="${API_BASE_URL}${post.image}" alt="Post image" class="post-image">` : ''}
      </div>
      ${post.tags && post.tags.length > 0 ? `
        <div class="post-tags">
          ${post.tags.map(tag => `<span class="tag">#${escapeHtml(tag)}</span>`).join('')}
        </div>
      ` : ''}
      <div class="post-actions">
        <button class="action-btn like-btn ${isLiked ? 'active' : ''}" data-id="${post._id}">
          <i class="${isLiked ? 'fas' : 'far'} fa-heart"></i>
          <span>${post.likesCount || 0}</span>
        </button>
        <button class="action-btn comment-btn" data-id="${post._id}">
          <i class="far fa-comment"></i>
          <span>${post.commentsCount || 0}</span>
        </button>
        <button class="action-btn share-btn" data-id="${post._id}">
          <i class="far fa-share-square"></i>
        </button>
      </div>
    </article>
  `;
}

/**
 * Attach post event listeners
 */
function attachPostEventListeners(container) {
  // Like buttons
  container.querySelectorAll('.like-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (!Auth.isLoggedIn()) {
        showToast('Please login to like posts', 'error');
        return;
      }
      
      const postId = btn.dataset.id;
      try {
        const result = await API.posts.like(postId);
        if (result.success) {
          btn.classList.toggle('active', result.data.liked);
          btn.querySelector('i').className = result.data.liked ? 'fas fa-heart' : 'far fa-heart';
          btn.querySelector('span').textContent = result.data.likesCount;
        }
      } catch (error) {
        showToast('Failed to like post', 'error');
      }
    });
  });
  
  // Comment buttons
  container.querySelectorAll('.comment-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      window.location.href = `pages/post.html?id=${btn.dataset.id}`;
    });
  });
  
  // Share buttons
  container.querySelectorAll('.share-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const url = `${window.location.origin}/pages/post.html?id=${btn.dataset.id}`;
      try {
        await navigator.clipboard.writeText(url);
        showToast('Link copied to clipboard', 'success');
      } catch (err) {
        showToast('Failed to copy link', 'error');
      }
    });
  });
  
  // Post clicks (navigate to detail)
  container.querySelectorAll('.post').forEach(post => {
    post.addEventListener('click', (e) => {
      if (!e.target.closest('.action-btn') && !e.target.closest('.post-menu')) {
        window.location.href = `pages/post.html?id=${post.dataset.id}`;
      }
    });
  });
  
  // Menu buttons
  container.querySelectorAll('.menu-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const dropdown = btn.nextElementSibling;
      dropdown.classList.toggle('show');
    });
  });
  
  // Edit/Delete post
  container.querySelectorAll('.edit-post').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const postId = btn.closest('.post').dataset.id;
      window.location.href = `pages/post.html?id=${postId}&edit=true`;
    });
  });
  
  container.querySelectorAll('.delete-post').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      if (!confirm('Are you sure you want to delete this post?')) return;
      
      const postId = btn.closest('.post').dataset.id;
      try {
        await API.posts.delete(postId);
        showToast('Post deleted', 'success');
        btn.closest('.post').remove();
      } catch (error) {
        showToast('Failed to delete post', 'error');
      }
    });
  });
}

// Close dropdowns when clicking outside
document.addEventListener('click', () => {
  document.querySelectorAll('.menu-dropdown').forEach(dropdown => {
    dropdown.classList.remove('show');
  });
});
