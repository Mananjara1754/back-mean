const jwt = require('jsonwebtoken');
const User = require('../models/User');

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '30d',
    });
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res) => {
    const { firstname, lastname, email, password, role, phone, avatar } = req.body;

    try {
        const userExists = await User.findOne({ 'profile.email': email });

        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const user = await User.create({
            role,
            profile: {
                firstname,
                lastname,
                email,
                password_hash: password, // Pre-save hook will hash this
                phone,
                avatar
            }
        });

        if (user) {
            res.status(201).json({
                _id: user._id,
                role: user.role,
                profile: user.profile,
                shop_id: user.shop_id,
                favorite_products: user.favorite_products,
                token: generateToken(user._id),
            });
        } else {
            res.status(400).json({ message: 'Invalid user data' });
        }
    } catch (error) {
        console.error(error);
        res.status(400).json({ message: error.message });
    }
};

// @desc    Authenticate a user & get token
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ 'profile.email': email });

        if (user && (await user.comparePassword(password))) {
            user.last_login = Date.now();
            await user.save();

            res.json({
                _id: user._id,
                role: user.role,
                profile: user.profile,
                shop_id: user.shop_id,
                favorite_products: user.favorite_products,
                token: generateToken(user._id),
            });
        } else {
            res.status(401).json({ message: 'Invalid email or password' });
        }
    } catch (error) {
        console.error(error);
        res.status(400).json({ message: error.message });
    }
};

// @desc    Get user profile
// @route   GET /api/auth/profile
// @access  Private
const getUserProfile = async (req, res) => {
    const user = await User.findById(req.user._id);

    if (user) {
        res.json({
            _id: user._id,
            role: user.role,
            status: user.status,
            profile: user.profile,
            shop_id: user.shop_id,
            last_login: user.last_login
        });
    } else {
        res.status(404).json({ message: 'User not found' });
    }
};

// Middleware to protect routes
const protect = async (req, res, next) => {
    let token;

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        try {
            token = req.headers.authorization.split(' ')[1];

            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            req.user = await User.findById(decoded.id).select('-profile.password_hash');

            next();
        } catch (error) {
            console.error(error);
            res.status(401).json({ message: 'Not authorized, token failed' });
        }
    }

    if (!token) {
        res.status(401).json({ message: 'Not authorized, no token' });
    }
};

// Middleware for role-based access
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: 'Not authorized' });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                message: `User role ${req.user.role} is not authorized to access this route`
            });
        }
        next();
    };
};

module.exports = {
    registerUser,
    loginUser,
    getUserProfile,
    protect,
    authorize
};
