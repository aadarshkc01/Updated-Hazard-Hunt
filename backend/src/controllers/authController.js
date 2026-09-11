import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';

const generateToken = (id) => {
  return jwt.sign(
    { id },
    process.env.JWT_SECRET || 'hazard_hunt_jwt_secure_key_2026_macro_thinkers',
    { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
  );
};

export const login = async (req, res) => {
  try {
    const { username, password, requestedRole } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both username and password',
      });
    }

    const user = await User.findOne({ username: username.toLowerCase().trim() });

    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. Please verify your username and password.',
      });
    }

    // Role-Lock Verification: Ensure trainee cannot log in through Supervisor/Admin tab
    if (requestedRole && requestedRole !== user.role) {
      const roleLabels = {
        employee: 'Employee (Trainee)',
        supervisor: 'HSE Supervisor',
        admin: 'System Administrator',
      };
      return res.status(403).json({
        success: false,
        message: `Access Denied: Account '${user.username}' is registered as ${roleLabels[user.role] || user.role}. You cannot sign in through the ${roleLabels[requestedRole] || requestedRole} portal.`,
      });
    }

    const token = generateToken(user._id);

    return res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        username: user.username,
        name: user.name,
        role: user.role,
        department: user.department,
        hasCompletedOnboarding: user.hasCompletedOnboarding,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error during authentication',
    });
  }
};

export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    return res.status(200).json({
      success: true,
      user: {
        id: user._id,
        username: user.username,
        name: user.name,
        role: user.role,
        department: user.department,
        hasCompletedOnboarding: user.hasCompletedOnboarding,
      },
    });
  } catch (error) {
    console.error('getMe error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const completeOnboarding = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { hasCompletedOnboarding: true },
      { new: true }
    ).select('-password');

    return res.status(200).json({
      success: true,
      message: 'Onboarding marked as completed',
      user: {
        id: user._id,
        username: user.username,
        name: user.name,
        role: user.role,
        department: user.department,
        hasCompletedOnboarding: user.hasCompletedOnboarding,
      },
    });
  } catch (error) {
    console.error('completeOnboarding error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};
