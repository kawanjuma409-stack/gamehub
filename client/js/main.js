// Main JavaScript for Home Page

document.addEventListener('DOMContentLoaded', async () => {
  // Initialize navigation
  initNavigation();
  
  // Check auth state
  const isLoggedIn = Auth.isLoggedIn();
  
  // Show/hide create post section
  const createPostSection = document.getElementById('createPostSection');
  if (createPostSection) {
    createPostSection.style.display = isLoggedIn ? 'block' : 'none';
    
    if (isLoggedIn) {
      initCreatePost();
    }
  }
  
  // Load initial data
  await Promise.all([
    loadPosts(),
    loadTrendingTags(),
    loadOnlineUsers()
  ]);
  
  // Setup filter buttons
  setupFilterButtons();
  
  // Setup load more
  setupLoadMore();
});

// Create Post functionality
function initCreatePost() {
  const user = Auth.getUser();
  
  // Set avatar
  const avatar = document.getElementById('createPostAvatar');
  if (avatar) {
    avatar.src = user?.avatar || 'assets/default-avatar.png';
  }
  
  // Image upload
  const addImageBtn = document.getElementById('addImageBtn');
  const imageInput = document.getElementById('imageInput');
  const imagePreview = document.getElementById('imagePreview');
  const removeImageBtn = document.getElementById('removeImage');
  
  if (addImageBtn && imageInput) {
    addImageBtn.addEventListener('click', () => imageInput.click());
    
    imageInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        if (file.size > APP_CONFIG.maxFileSize) {
          showToast('Image must be less than 5MB', 'error');
          return;
        }
        
        const reader = new FileReader();
        reader.onload = (e) => {
          imagePreview.querySelector('img').src = e.target.result;
          imagePreview.style.display = 'block';
        };
        reader.readAsDataURL(file);
      }
    });
  }
  
  if (removeImageBtn) {
    removeImageBtn.addEventListener('click', () => {
      imageInput.value = '';
      imagePreview.style.display = 'none';
      imagePreview.querySelector('img').src = '';
    });
  }
  
  // Tags
  const addTagBtn = document.getElementById('addTagBtn');
  const tagModal = document.getElementById('tagModal');
  let currentTags = [];
  
  if (addTagBtn && tagModal) {
    addTagBtn.addEventListener('click', () => {
      tagModal.style.display = 'flex';
      document.getElementById('tagInput').focus();
    });
    
    document.getElementById('closeTagModal').addEventListener('click', () => {
      tagModal.style.display = 'none';
    });
    
    document.getElementById('confirmTags').addEventListener('click', () => {
      tagModal.style.display = 'none';
    });
    
    const tagInput = document.getElementById('tagInput');
    const tagContainer = document.getElementById('tagInputContainer');
    
    tagInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const tag = tagInput.value.trim().toLowerCase();
        
        if (tag && !currentTags.includes(tag) && currentTags.length < 5) {
          currentTags.push(tag);
          renderTags();
          tagInput.value = '';
        }
      }
    });
    
    function renderTags() {
      // Clear existing tags in input container
      tagContainer.querySelectorAll('.tag-item').forEach(el => el.remove());
      
      // Add tags before input
      currentTags.forEach((tag, index) => {
        const tagEl = document.createElement('span');
        tagEl.className = 'tag-item';
        tagEl.innerHTML = `${tag} <i class="fas fa-times" data-index="${index}"></i>`;
        tagContainer.insertBefore(tagEl, tagInput);
      });
      
      // Update post tags display
      const postTags = document.getElementById('postTags');
      postTags.innerHTML = currentTags.map(tag => `<span class="tag">#${tag}</span>`).join('');
    }
    
    // Remove tag on click
    tagContainer.addEventListener('click', (e) => {
      if (e.target.classList.contains('fa-times')) {
        const index = parseInt(e.target.dataset.index);
        currentTags.splice(index, 1);
        renderTags();
      }
    });
  }
  
  // Submit post
  const submitBtn = document.getElementById('submitPost');
  const postContent = document.getElementById('postContent');
  
  if (submitBtn && postContent) {
    submitBtn.addEventListener('click', async () => {
      const content = postContent.value.trim();
      
      if (!content) {
        showToast('Please write something', 'error');
        return;
      }
      
      const imageFile = imageInput?.files[0];
      
      try {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Posting...';
        
        await API.posts.create({
          content,
          tags: currentTags,
          image: imageFile
        });
        
        showToast('Post created successfully!', 'success');
        
        // Reset form
        postContent.value = '';
        imageInput.value = '';
        imagePreview.style.display = 'none';
        currentTags = [];
        document.getElementById('postTags').innerHTML = '';
        
        // Reload posts
        await loadPosts();
      } catch (error) {
        showToast(error.message || 'Failed to create post', 'error');
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Post';
      }
    });
  }
}

// Load posts
let currentPage = 1;
let currentFilter = 'latest';
let hasMorePosts = true;
let isLoading = false;

async function loadPosts(page = 1, append = false) {
  if (isLoading || (!hasMorePosts && page > 1)) return;
  
  isLoading = true;
  const container = document.getElementById('postsContainer');
  
  if (!append) {
    container.innerHTML = '<div class="loading">Loading posts...</div>';
  }
  
  try {
    const result = await API.posts.getAll({ page, limit: APP_CONFIG.postsPerPage });
    
    if (result.success) {
      const { posts, pagination } = result.data;
      
      hasMorePosts = pagination.hasMore;
      
      if (posts.length === 0 && page === 1) {
        container.innerHTML = `
          <div class="empty-state">
            <i class="fas fa-inbox"></i>
            <p>No posts yet</p>
            <span>Be the first to share something!</span>
          </div>
        `;
      } else {
        const postsHTML = posts.map(post => createPostHTML(post)).join('');
        
        if (append) {
          container.insertAdjacentHTML('beforeend', postsHTML);
        } else {
          container.innerHTML = postsHTML;
        }
        
        attachPostEventListeners(container);
        
        // Show/hide load more button
        const loadMoreBtn = document.getElementById('loadMore');
        if (loadMoreBtn) {
          loadMoreBtn.style.display = hasMorePosts ? 'flex' : 'none';
        }
      }
    }
  } catch (error) {
    console.error('Load posts error:', error);
    if (!append) {
      container.innerHTML = '<div class="error">Failed to load posts. Please try again.</div>';
    }
  } finally {
    isLoading = false;
  }
}

// Setup filter buttons
function setupFilterButtons() {
  const filterBtns = document.querySelectorAll('.feed-filter .filter-btn');
  
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      currentFilter = btn.dataset.filter;
      currentPage = 1;
      hasMorePosts = true;
      
      // TODO: Implement filtering logic
      loadPosts(1, false);
    });
  });
}

// Setup load more button
function setupLoadMore() {
  const loadMoreBtn = document.getElementById('loadMore');
  
  if (loadMoreBtn) {
    loadMoreBtn.addEventListener('click', () => {
      if (!isLoading && hasMorePosts) {
        currentPage++;
        loadPosts(currentPage, true);
      }
    });
  }
  
  // Infinite scroll
  window.addEventListener('scroll', throttle(() => {
    if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 500) {
      if (!isLoading && hasMorePosts) {
        currentPage++;
        loadPosts(currentPage, true);
      }
    }
  }, 500));
}

// Load trending tags
async function loadTrendingTags() {
  const container = document.getElementById('trendingTags');
  if (!container) return;
  
  try {
    const result = await API.posts.getTrendingTags();
    
    if (result.success && result.data.tags.length > 0) {
      container.innerHTML = result.data.tags.map(tag => `
        <span class="tag-item" data-tag="${tag.name}">
          #${tag.name} <small>(${formatNumber(tag.count)})</small>
        </span>
      `).join('');
      
      // Add click handlers
      container.querySelectorAll('.tag-item').forEach(item => {
        item.addEventListener('click', () => {
          window.location.href = `pages/search.html?q=${encodeURIComponent('#' + item.dataset.tag)}`;
        });
      });
    } else {
      container.innerHTML = '<p class="empty">No trending tags</p>';
    }
  } catch (error) {
    console.error('Load trending tags error:', error);
    container.innerHTML = '<p class="empty">Failed to load</p>';
  }
}

// Load online users
async function loadOnlineUsers() {
  const container = document.getElementById('onlineUsers');
  if (!container) return;
  
  // This would be a real API call in production
  // For now, show some placeholder content
  container.innerHTML = '<p class="empty">Sign in to see online users</p>';
}

// Format number
function formatNumber(num) {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
  return num.toString();
}
