# GameHub - Gaming Community Platform

A full-stack gaming community website where gamers can connect, share posts, like, comment, and interact with each other.

![GameHub Screenshot](screenshot.png)

## Features

### User Authentication
- User registration with email verification
- Secure login with JWT tokens
- Password hashing with bcrypt
- Session management

### User Profiles
- Customizable username and avatar
- Bio section
- Follow/Unfollow users
- View followers and following lists
- Online status indicator

### Posts
- Create text posts with optional image uploads
- Edit and delete own posts
- Like and unlike posts
- View post engagement stats

### Comments
- Comment on posts
- Reply to comments (nested replies)
- Edit and delete own comments
- Like comments

### Notifications
- Real-time notifications for likes, comments, and follows
- Unread notification counter
- Mark notifications as read

### Search
- Search for posts and users
- Trending tags
- Search suggestions

### Security
- Input validation
- Rate limiting to prevent spam
- Protected routes with authentication middleware
- XSS protection

## Tech Stack

### Frontend
- HTML5
- CSS3 (Custom styling with CSS variables)
- Vanilla JavaScript (ES6+)
- Font Awesome icons
- Google Fonts (Orbitron, Inter)

### Backend
- Node.js
- Express.js
- MongoDB with Mongoose
- JWT for authentication
- bcryptjs for password hashing
- Multer for file uploads
- express-rate-limit for rate limiting

## Project Structure

```
gaming-community/
├── client/                     # Frontend files
│   ├── assets/                # Static assets (images, etc.)
│   ├── css/
│   │   └── style.css          # Main stylesheet
│   ├── js/
│   │   ├── config.js          # Configuration
│   │   ├── utils.js           # Utility functions
│   │   ├── api.js             # API client
│   │   ├── auth.js            # Authentication state
│   │   ├── main.js            # Home page logic
│   │   └── profile.js         # Profile page logic
│   ├── pages/                 # HTML pages
│   │   ├── login.html
│   │   ├── register.html
│   │   ├── profile.html
│   │   ├── post.html
│   │   ├── notifications.html
│   │   ├── explore.html
│   │   ├── search.html
│   │   └── settings.html
│   └── index.html             # Home page
│
├── server/                     # Backend files
│   ├── middleware/
│   │   ├── auth.js            # Authentication middleware
│   │   ├── upload.js          # File upload middleware
│   │   └── validation.js      # Input validation
│   ├── models/
│   │   ├── User.js            # User model
│   │   ├── Post.js            # Post model
│   │   ├── Comment.js         # Comment model
│   │   ├── Notification.js    # Notification model
│   │   └── index.js           # Models export
│   ├── routes/
│   │   ├── auth.js            # Authentication routes
│   │   ├── posts.js           # Post routes
│   │   ├── comments.js        # Comment routes
│   │   ├── notifications.js   # Notification routes
│   │   ├── users.js           # User routes
│   │   └── search.js          # Search routes
│   ├── uploads/               # Uploaded files
│   │   ├── posts/
│   │   └── avatars/
│   ├── .env.example           # Environment variables template
│   ├── package.json           # Dependencies
│   └── server.js              # Main server file
│
└── README.md                   # This file
```

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (local or Atlas)
- npm or yarn

## Installation & Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd gaming-community
```

### 2. Setup Backend

```bash
cd server

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Edit .env with your configuration
```

### 3. Configure Environment Variables

Edit `server/.env`:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# MongoDB Connection
MONGODB_URI=mongodb://localhost:27017/gaming-community
# OR for MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/gaming-community

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRE=7d

# Client URL (for CORS)
CLIENT_URL=http://localhost:3000
```

### 4. Start MongoDB

**Local MongoDB:**
```bash
# Make sure MongoDB is running
mongod
```

**Or use MongoDB Atlas (cloud):**
- Create a free account at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
- Create a cluster and get your connection string
- Update `MONGODB_URI` in `.env`

### 5. Start the Server

```bash
# In the server directory
npm start

# Or for development with auto-reload
npm run dev
```

The server will start on `http://localhost:5000`

### 6. Setup Frontend

The frontend is pure HTML/CSS/JS and doesn't require a build step. You can serve it using any static file server.

**Option 1: Using VS Code Live Server**
- Install the "Live Server" extension
- Right-click on `client/index.html`
- Select "Open with Live Server"

**Option 2: Using Python**
```bash
cd client
python3 -m http.server 3000
```

**Option 3: Using Node.js (http-server)**
```bash
npm install -g http-server
cd client
http-server -p 3000
```

**Option 4: Using PHP**
```bash
cd client
php -S localhost:3000
```

The frontend will be available at `http://localhost:3000`

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/me` - Get current user
- `POST /api/auth/refresh` - Refresh JWT token

### Posts
- `GET /api/posts` - Get all posts (feed)
- `GET /api/posts/:id` - Get single post
- `POST /api/posts` - Create new post
- `PUT /api/posts/:id` - Update post
- `DELETE /api/posts/:id` - Delete post
- `POST /api/posts/:id/like` - Like/unlike post
- `GET /api/posts/user/:userId` - Get posts by user
- `GET /api/posts/trending/tags` - Get trending tags

### Comments
- `GET /api/comments/post/:postId` - Get comments for post
- `GET /api/comments/:id` - Get single comment
- `POST /api/comments` - Create comment
- `PUT /api/comments/:id` - Update comment
- `DELETE /api/comments/:id` - Delete comment
- `POST /api/comments/:id/like` - Like/unlike comment

### Users
- `GET /api/users/:username` - Get user by username
- `GET /api/users/id/:id` - Get user by ID
- `PUT /api/users/profile` - Update profile
- `POST /api/users/:id/follow` - Follow/unfollow user
- `GET /api/users/:id/followers` - Get user followers
- `GET /api/users/:id/following` - Get user following
- `GET /api/users/:id/posts` - Get user posts
- `GET /api/users/:id/comments` - Get user comments

### Notifications
- `GET /api/notifications` - Get notifications
- `GET /api/notifications/unread-count` - Get unread count
- `PUT /api/notifications/:id/read` - Mark as read
- `PUT /api/notifications/read-all` - Mark all as read
- `DELETE /api/notifications/:id` - Delete notification

### Search
- `GET /api/search?q=query` - Search posts and users
- `GET /api/search/posts?q=query` - Search posts only
- `GET /api/search/users?q=query` - Search users only
- `GET /api/search/suggestions?q=query` - Get search suggestions

## Usage Guide

### Creating an Account
1. Visit the homepage and click "Sign Up"
2. Enter username, email, and password
3. Click "Create Account"

### Creating a Post
1. Login to your account
2. On the home page, use the "What's on your mind?" box
3. Add optional image by clicking the image icon
4. Add tags by clicking the hashtag icon
5. Click "Post" to share

### Interacting with Posts
- Click the heart icon to like a post
- Click the comment icon to view and add comments
- Click the share icon to copy the post link

### Following Users
1. Visit a user's profile
2. Click the "Follow" button
3. Their posts will appear in your "Following" feed

### Editing Profile
1. Go to your profile page
2. Click "Edit Profile"
3. Update your avatar, username, or bio
4. Click "Save Changes"

## Security Features

- **Password Hashing**: All passwords are hashed using bcrypt with salt
- **JWT Authentication**: Secure token-based authentication
- **Rate Limiting**: API endpoints are protected against spam
- **Input Validation**: All user inputs are validated and sanitized
- **XSS Protection**: Content is escaped to prevent cross-site scripting

## Development

### Running in Development Mode

```bash
# Terminal 1 - Start server
cd server
npm run dev

# Terminal 2 - Serve client
cd client
python3 -m http.server 3000
```

### Adding New Features

1. **Backend**: Add routes in `server/routes/`
2. **Frontend**: Add pages in `client/pages/`
3. **API**: Add methods in `client/js/api.js`
4. **Styles**: Add CSS in `client/css/style.css`

## Troubleshooting

### MongoDB Connection Issues
- Ensure MongoDB is running locally
- Check your `MONGODB_URI` in `.env`
- For Atlas, whitelist your IP address

### CORS Errors
- Ensure `CLIENT_URL` in server `.env` matches your frontend URL
- Default is `http://localhost:3000`

### File Upload Issues
- Ensure `uploads` directory exists and is writable
- Check file size (max 5MB)
- Supported formats: JPEG, PNG, GIF, WebP

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.

## Acknowledgments

- Font Awesome for icons
- Google Fonts for typography
- MongoDB for database
- Express.js for the backend framework
