// Profile Page JavaScript

let currentUser = null;
let isOwnProfile = false;
let currentTab = 'posts';

// Load profile data
async function loadProfile() {
  const urlParams = new URLSearchParams(window.location.search);
  const username = urlParams.get('user');
  
  // If no username specified, show current user's profile
  const targetUsername = username || Auth.getUser()?.username;
  
  if (!targetUsername) {
    window.location.href = 'login.html';
    return;
  }
  
  try {
    const result = await API.users.getByUsername(targetUsername);
    
    if (!result.success) {
      showToast('User not found', 'error');
      return;
    }
    
    currentUser = result.data.user;
    isOwnProfile = Auth.isLoggedIn() && currentUser._id === Auth.getUser()?.id;
    
    // Update profile UI
    updateProfileUI();
    
    // Load posts
    loadUserPosts();
    
    // Setup tabs
    setupTabs();
    
    // Setup edit profile button
    if (isOwnProfile) {
      setupEditProfile();
    }
    
    // Setup follow button
    if (!isOwnProfile && Auth.isLoggedIn()) {
      setupFollowButton();
    }
    
  } catch (error) {
    console.error('Load profile error:', error);
    showToast('Failed to load profile', 'error');
  }
}

// Update profile UI
function updateProfileUI() {
  // Avatar
  const avatar = document.getElementById('profileAvatar');
  if (avatar) {
    avatar.src = currentUser.avatar || '../assets/default-avatar.png';
  }
  
  // Online status
  const onlineStatus = document.getElementById('onlineStatus');
  if (onlineStatus) {
    onlineStatus.className = 'online-status' + (currentUser.isOnline ? '' : ' offline');
  }
  
  // Name and username
  const nameEl = document.getElementById('profileName');
  const usernameEl = document.getElementById('profileUsername');
  
  if (nameEl) nameEl.textContent = currentUser.username;
  if (usernameEl) usernameEl.textContent = `@${currentUser.username}`;
  
  // Bio
  const bioEl = document.getElementById('profileBio');
  if (bioEl) {
    bioEl.textContent = currentUser.bio || 'No bio yet';
  }
  
  // Join date
  const joinDateEl = document.getElementById('joinDate');
  if (joinDateEl) {
    joinDateEl.textContent = formatDate(currentUser.createdAt, { month: 'long', year: 'numeric' });
  }
  
  // Role badge
  const roleEl = document.getElementById('profileRole');
  if (roleEl && currentUser.role !== 'user') {
    roleEl.style.display = 'inline';
    roleEl.querySelector('span').textContent = currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1);
  }
  
  // Stats
  const postsCount = document.getElementById('postsCount');
  const followersCount = document.getElementById('followersCount');
  const followingCount = document.getElementById('followingCount');
  const likesCount = document.getElementById('likesCount');
  
  if (postsCount) postsCount.textContent = currentUser.postsCount || 0;
  if (followersCount) followersCount.textContent = currentUser.followers?.length || 0;
  if (followingCount) followingCount.textContent = currentUser.following?.length || 0;
  if (likesCount) likesCount.textContent = currentUser.likedPosts?.length || 0;
  
  // Edit button
  const editBtn = document.getElementById('editProfileBtn');
  if (editBtn) {
    editBtn.style.display = isOwnProfile ? 'flex' : 'none';
  }
  
  // Follow button
  const followBtn = document.getElementById('followBtn');
  if (followBtn) {
    followBtn.style.display = !isOwnProfile && Auth.isLoggedIn() ? 'flex' : 'none';
  }
}

// Setup tabs
function setupTabs() {
  const tabBtns = document.querySelectorAll('.feed-tabs .tab-btn');
  
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      
      btn.classList.add('active');
      const tab = btn.dataset.tab;
      document.getElementById(tab + 'Tab').classList.add('active');
      
      currentTab = tab;
      
      // Load tab content
      if (tab === 'posts') {
        loadUserPosts();
      } else if (tab === 'comments') {
        loadUserComments();
      } else if (tab === 'likes') {
        loadUserLikes();
      }
    });
  });
}

// Load user posts
async function loadUserPosts() {
  const container = document.getElementById('postsContainer');
  container.innerHTML = '<div class="loading">Loading posts...</div>';
  
  try {
    const result = await API.users.getPosts(currentUser._id);
    
    if (result.success && result.data.posts.length > 0) {
      container.innerHTML = result.data.posts.map(post => createPostHTML(post)).join('');
      attachPostEventListeners(container);
    } else {
      container.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-file-alt"></i>
          <p>No posts yet</p>
        </div>
      `;
    }
  } catch (error) {
    console.error('Load user posts error:', error);
    container.innerHTML = '<div class="error">Failed to load posts</div>';
  }
}

// Load user comments
async function loadUserComments() {
  const container = document.getElementById('commentsContainer');
  container.innerHTML = '<div class="loading">Loading comments...</div>';
  
  try {
    const result = await API.users.getComments(currentUser._id);
    
    if (result.success && result.data.comments.length > 0) {
      container.innerHTML = result.data.comments.map(comment => `
        <div class="comment-item">
          <div class="comment-header">
            <span>Commented on <a href="post.html?id=${comment.post._id}">post</a></span>
            <span class="comment-time">${formatTimeAgo(comment.createdAt)}</span>
          </div>
          <p>${escapeHtml(comment.content)}</p>
        </div>
      `).join('');
    } else {
      container.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-comments"></i>
          <p>No comments yet</p>
        </div>
      `;
    }
  } catch (error) {
    console.error('Load user comments error:', error);
    container.innerHTML = '<div class="error">Failed to load comments</div>';
  }
}

// Load user likes
async function loadUserLikes() {
  const container = document.getElementById('likesContainer');
  container.innerHTML = '<div class="loading">Loading liked posts...</div>';
  
  // This would require a separate API endpoint
  // For now, show placeholder
  container.innerHTML = `
    <div class="empty-state">
      <i class="fas fa-heart"></i>
      <p>No liked posts</p>
    </div>
  `;
}

// Setup edit profile
function setupEditProfile() {
  const editBtn = document.getElementById('editProfileBtn');
  const modal = document.getElementById('editProfileModal');
  
  if (editBtn && modal) {
    editBtn.addEventListener('click', () => {
      // Populate form
      document.getElementById('editUsername').value = currentUser.username;
      document.getElementById('editBio').value = currentUser.bio || '';
      document.getElementById('editAvatarPreview').src = currentUser.avatar || '../assets/default-avatar.png';
      
      modal.style.display = 'flex';
    });
    
    document.getElementById('closeEditModal').addEventListener('click', () => {
      modal.style.display = 'none';
    });
    
    // Avatar upload
    const avatarInput = document.getElementById('avatarInput');
    const avatarPreview = document.getElementById('editAvatarPreview');
    
    document.querySelector('.avatar-upload').addEventListener('click', () => {
      avatarInput.click();
    });
    
    avatarInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          avatarPreview.src = e.target.result;
        };
        reader.readAsDataURL(file);
      }
    });
    
    // Remove avatar
    document.getElementById('removeAvatar').addEventListener('click', () => {
      avatarPreview.src = '../assets/default-avatar.png';
      avatarInput.value = '';
    });
    
    // Bio character count
    const bioInput = document.getElementById('editBio');
    const charCount = document.getElementById('bioCharCount');
    
    bioInput.addEventListener('input', () => {
      charCount.textContent = bioInput.value.length;
    });
    
    // Form submission
    document.getElementById('editProfileForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const username = document.getElementById('editUsername').value.trim();
      const bio = document.getElementById('editBio').value;
      const avatarFile = avatarInput.files[0];
      
      try {
        const result = await API.users.updateProfile({
          username,
          bio,
          avatar: avatarFile
        });
        
        if (result.success) {
          showToast('Profile updated successfully', 'success');
          
          // Update local user data
          Auth.updateUser(result.data.user);
          
          // Reload profile
          modal.style.display = 'none';
          loadProfile();
        }
      } catch (error) {
        showToast(error.message || 'Failed to update profile', 'error');
      }
    });
  }
}

// Setup follow button
function setupFollowButton() {
  const followBtn = document.getElementById('followBtn');
  if (!followBtn) return;
  
  // Check if already following
  const currentUserData = Auth.getUser();
  const isFollowing = currentUserData?.following?.includes(currentUser._id);
  
  updateFollowButton(isFollowing);
  
  followBtn.addEventListener('click', async () => {
    try {
      followBtn.disabled = true;
      
      const result = await API.users.follow(currentUser._id);
      
      if (result.success) {
        updateFollowButton(result.data.following);
        
        // Update follower count
        const followersCount = document.getElementById('followersCount');
        const currentCount = parseInt(followersCount.textContent);
        followersCount.textContent = result.data.following ? currentCount + 1 : currentCount - 1;
      }
    } catch (error) {
      showToast('Failed to follow user', 'error');
    } finally {
      followBtn.disabled = false;
    }
  });
}

function updateFollowButton(isFollowing) {
  const followBtn = document.getElementById('followBtn');
  
  if (isFollowing) {
    followBtn.innerHTML = '<i class="fas fa-user-check"></i> Following';
    followBtn.classList.remove('btn-primary');
    followBtn.classList.add('btn-outline');
  } else {
    followBtn.innerHTML = '<i class="fas fa-user-plus"></i> Follow';
    followBtn.classList.remove('btn-outline');
    followBtn.classList.add('btn-primary');
  }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', loadProfile);
