const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Admin = require('../models/Admin');
const { Role, Permission } = require('../models/RolePermission');
const { JWT_SECRET } = require('../middleware/auth');

// Helper: Generate JWT Token
const generateToken = (id, role = 'user') => {
  return jwt.sign({ id, role }, JWT_SECRET, { expiresIn: '7d' });
};

// SEED ROLES & ADMIN ON FIRST BOOT
exports.seedAdminRoles = async () => {
  try {
    // 1. Seed Permissions
    const permissionsToSeed = [
      { name: 'manage_movies', description: 'Can create, edit, delete movies' },
      { name: 'manage_dramas', description: 'Can create, edit, delete dramas/seasons/episodes' },
      { name: 'approve_subtitles', description: 'Can moderate subtitle uploads' },
      { name: 'manage_comments', description: 'Can moderate reviews and comments' },
      { name: 'manage_users', description: 'Can manage front-end user statuses' },
      { name: 'view_analytics', description: 'Access to traffic and SEO dashboard' },
      { name: 'manage_settings', description: 'Configure API keys and site flags' }
    ];

    const permissionIds = {};
    for (const p of permissionsToSeed) {
      const doc = await Permission.findOneAndUpdate({ name: p.name }, p, { upsert: true, new: true });
      permissionIds[p.name] = doc._id;
    }

    // 2. Seed Roles
    const superAdminRole = await Role.findOneAndUpdate(
      { name: 'SuperAdmin' },
      { name: 'SuperAdmin', permissions: Object.values(permissionIds) },
      { upsert: true, new: true }
    );

    const moderatorRole = await Role.findOneAndUpdate(
      { name: 'Moderator' },
      { 
        name: 'Moderator', 
        permissions: [
          permissionIds['approve_subtitles'],
          permissionIds['manage_comments'],
          permissionIds['view_analytics']
        ] 
      },
      { upsert: true, new: true }
    );

    const editorRole = await Role.findOneAndUpdate(
      { name: 'Editor' },
      {
        name: 'Editor',
        permissions: [
          permissionIds['manage_movies'],
          permissionIds['manage_dramas']
        ]
      },
      { upsert: true, new: true }
    );

    // 3. Seed Default Admin (SuperAdmin)
    const adminExists = await Admin.findOne({ email: 'admin@ksubzone.com' });
    if (!adminExists) {
      const newAdmin = new Admin({
        username: 'superadmin',
        email: 'admin@ksubzone.com',
        password: 'adminpassword123', // Undergoes automatic pre-save hashing
        role: superAdminRole._id
      });
      await newAdmin.save();
      console.log('Seeded default Admin: admin@ksubzone.com / adminpassword123');
    }
  } catch (error) {
    console.error('Error seeding roles/admin:', error);
  }
};

// USER REGISTRATION
exports.register = async (req, res, next) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ message: 'Please provide all details' });
  }

  try {
    const userExists = await User.findOne({ $or: [{ email }, { username }] });
    if (userExists) {
      return res.status(400).json({ message: 'Username or Email is already registered' });
    }

    const verificationToken = Math.floor(100000 + Math.random() * 900000).toString(); // 6 digit code

    const user = new User({
      username,
      email,
      password,
      verificationToken,
      isVerified: false
    });

    await user.save();

    return res.status(201).json({
      message: 'Registration successful. Please verify your email with the 6-digit code.',
      email: user.email,
      verificationCode: verificationToken // Returning for easy testing/demo without SMTP setup
    });
  } catch (error) {
    next(error);
  }
};

// EMAIL VERIFICATION
exports.verifyEmail = async (req, res, next) => {
  const email = req.body.email?.trim().toLowerCase();
  const code = req.body.code?.trim();
  if (!email || !code) {
    return res.status(400).json({ message: 'Email and 6-digit code are required' });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.verificationToken !== code) {
      return res.status(400).json({ message: 'Invalid verification code' });
    }

    user.isVerified = true;
    user.verificationToken = undefined;
    await user.save();

    const token = generateToken(user._id, 'user');

    return res.status(200).json({
      message: 'Email verified successfully',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        isVerified: user.isVerified
      }
    });
  } catch (error) {
    next(error);
  }
};

// USER LOGIN
exports.login = async (req, res, next) => {
  const { email, password, code2fa } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and Password are required' });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (user.status === 'suspended') {
      return res.status(403).json({ message: 'Your account is suspended' });
    }

    // 2FA check
    if (user.twoFactorEnabled) {
      if (!code2fa) {
        return res.status(200).json({ require2Fa: true, message: '2FA verification code required' });
      }
      // Demo verification: accept '123456' or any code for testing
      if (code2fa !== '123456' && code2fa !== user.twoFactorSecret) {
        return res.status(400).json({ message: 'Invalid 2FA code' });
      }
    }

    const token = generateToken(user._id, 'user');

    return res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        isVerified: user.isVerified
      }
    });
  } catch (error) {
    next(error);
  }
};

// ADMIN LOGIN
exports.adminLogin = async (req, res, next) => {
  const { email, password, code2fa } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and Password are required' });
  }

  try {
    const admin = await Admin.findOne({ email }).populate('role');
    if (!admin) {
      return res.status(401).json({ message: 'Invalid admin credentials' });
    }

    const isMatch = await admin.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid admin credentials' });
    }

    // 2FA check
    if (admin.twoFactorEnabled) {
      if (!code2fa) {
        return res.status(200).json({ require2Fa: true, message: '2FA verification code required' });
      }
      if (code2fa !== '123456') {
        return res.status(400).json({ message: 'Invalid 2FA code' });
      }
    }

    admin.lastLogin = new Date();
    await admin.save();

    const token = generateToken(admin._id, 'admin');

    return res.status(200).json({
      message: 'Admin login successful',
      token,
      admin: {
        id: admin._id,
        username: admin.username,
        email: admin.email,
        role: admin.role.name
      }
    });
  } catch (error) {
    next(error);
  }
};

// GET CURRENT USER ME
exports.getMe = async (req, res, next) => {
  try {
    const Movie = require('../models/Movie');
    const Drama = require('../models/Drama');

    const user = await User.findById(req.user.id).select('-password').lean();
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Populate favorites
    const favMovies = await Movie.find({ _id: { $in: user.favorites.filter(f => f.mediaType === 'Movie').map(f => f.mediaId) } }).lean();
    const favDramas = await Drama.find({ _id: { $in: user.favorites.filter(f => f.mediaType === 'Drama').map(f => f.mediaId) } }).lean();
    user.favorites = user.favorites.map(f => {
      const details = f.mediaType === 'Movie' 
        ? favMovies.find(m => m._id.toString() === f.mediaId.toString())
        : favDramas.find(d => d._id.toString() === f.mediaId.toString());
      return { ...f, details };
    });

    // Populate watchlist
    const wlMovies = await Movie.find({ _id: { $in: user.watchlist.filter(w => w.mediaType === 'Movie').map(w => w.mediaId) } }).lean();
    const wlDramas = await Drama.find({ _id: { $in: user.watchlist.filter(w => w.mediaType === 'Drama').map(w => w.mediaId) } }).lean();
    user.watchlist = user.watchlist.map(w => {
      const details = w.mediaType === 'Movie' 
        ? wlMovies.find(m => m._id.toString() === w.mediaId.toString())
        : wlDramas.find(d => d._id.toString() === w.mediaId.toString());
      return { ...w, details };
    });

    // Populate continueWatching
    const cwMovies = await Movie.find({ _id: { $in: user.continueWatching.filter(c => c.mediaType === 'Movie').map(c => c.mediaId) } }).lean();
    const cwDramas = await Drama.find({ _id: { $in: user.continueWatching.filter(c => c.mediaType === 'Drama').map(c => c.mediaId) } }).lean();
    user.continueWatching = user.continueWatching.map(c => {
      const details = c.mediaType === 'Movie' 
        ? cwMovies.find(m => m._id.toString() === c.mediaId.toString())
        : cwDramas.find(d => d._id.toString() === c.mediaId.toString());
      return { ...c, details };
    });

    return res.status(200).json(user);
  } catch (error) {
    next(error);
  }
};

// GET CURRENT ADMIN ME
exports.getAdminMe = async (req, res, next) => {
  try {
    const admin = await Admin.findById(req.admin.id).populate('role').select('-password');
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    return res.status(200).json({
      id: admin._id,
      username: admin.username,
      email: admin.email,
      role: admin.role?.name || 'Admin',
      twoFactorEnabled: admin.twoFactorEnabled,
      lastLogin: admin.lastLogin,
      createdAt: admin.createdAt
    });
  } catch (error) {
    next(error);
  }
};

// FORGOT PASSWORD (MOCK)
exports.forgotPassword = async (req, res, next) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'Email address not found' });
    }
    const resetToken = Math.floor(100000 + Math.random() * 900000).toString();
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    await user.save();

    return res.status(200).json({
      message: 'Password reset code generated and sent.',
      resetCode: resetToken // Return for easy demo testing
    });
  } catch (error) {
    next(error);
  }
};

// RESET PASSWORD (MOCK)
exports.resetPassword = async (req, res, next) => {
  const { email, code, newPassword } = req.body;
  try {
    const user = await User.findOne({
      email,
      resetPasswordToken: code,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid reset code or code has expired' });
    }

    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    return res.status(200).json({ message: 'Password updated successfully' });
  } catch (error) {
    next(error);
  }
};

// TOGGLE 2FA SETTING
exports.toggle2FA = async (req, res, next) => {
  const { enable } = req.body;
  try {
    const user = await User.findById(req.user.id);
    if (enable) {
      user.twoFactorEnabled = true;
      user.twoFactorSecret = '123456'; // Default static key for demo 2FA
    } else {
      user.twoFactorEnabled = false;
      user.twoFactorSecret = undefined;
    }
    await user.save();
    return res.status(200).json({ message: `2FA ${enable ? 'enabled' : 'disabled'} successfully`, twoFactorEnabled: user.twoFactorEnabled });
  } catch (error) {
    next(error);
  }
};
