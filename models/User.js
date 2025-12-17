const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const userSchema = new mongoose.Schema({
  _id: {
    type: String,
    default: () => uuidv4()
  },
  phoneNumber: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  name: {
    type: String,
    default: null
  },
  businessName: {
    type: String,
    default: null
  },
  purpose: {
    type: String,
    required: true,
    enum: ['personal', 'business'],
    default: 'personal'
  },
  showDate: {
    type: Boolean,
    default: true
  },
  language: {
    type: String,
    enum: ['english', 'hindi'],
    default: 'english'
  },
  profileImagePath: {
    type: String,
    default: null
  },
  logoPath: {
    type: String,
    default: null
  },
  isPremium: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true,
  _id: false
});

const User = mongoose.model('User', userSchema);

class UserModel {
  static async findByPhoneNumber(phoneNumber) {
    if (!phoneNumber || typeof phoneNumber !== 'string') {
      return null;
    }
    try {
      return await User.findOne({ phoneNumber: phoneNumber.trim() });
    } catch (error) {
      console.error('Find user by phone error:', error.message);
      throw error;
    }
  }

  static async findById(userId) {
    if (!userId || typeof userId !== 'string') {
      return null;
    }
    try {
      return await User.findById(userId.trim());
    } catch (error) {
      console.error('Find user by ID error:', error.message);
      throw error;
    }
  }

  static async create(userData) {
    if (!userData || !userData.phoneNumber) {
      throw new Error('Phone number is required');
    }

    const user = new User({
      _id: uuidv4(),
      phoneNumber: String(userData.phoneNumber).trim(),
      name: userData.name ? String(userData.name).trim() : null,
      businessName: userData.businessName ? String(userData.businessName).trim() : null,
      purpose: userData.purpose || 'personal',
      showDate: userData.showDate !== undefined ? Boolean(userData.showDate) : true,
      language: userData.language || 'english',
      profileImagePath: userData.profileImagePath ? String(userData.profileImagePath).trim() : null,
      logoPath: userData.logoPath ? String(userData.logoPath).trim() : null,
      isPremium: Boolean(userData.isPremium || false)
    });
    
    await user.save();
    return user;
  }

  static async update(userId, updateData) {
    const updateFields = {};
    
    if (updateData.name !== undefined) updateFields.name = updateData.name;
    if (updateData.businessName !== undefined) updateFields.businessName = updateData.businessName;
    if (updateData.purpose !== undefined) updateFields.purpose = updateData.purpose;
    if (updateData.showDate !== undefined) updateFields.showDate = updateData.showDate;
    if (updateData.language !== undefined) updateFields.language = updateData.language;
    if (updateData.profileImagePath !== undefined) updateFields.profileImagePath = updateData.profileImagePath;
    if (updateData.logoPath !== undefined) updateFields.logoPath = updateData.logoPath;
    if (updateData.isPremium !== undefined) updateFields.isPremium = updateData.isPremium;

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: updateFields },
      { new: true, runValidators: true }
    );

    return user;
  }

  static formatUser(user) {
    if (!user) return null;
    
    const userObj = user.toObject ? user.toObject() : user;
    
    return {
      id: userObj._id || userObj.id,
      phoneNumber: userObj.phoneNumber,
      name: userObj.name,
      businessName: userObj.businessName,
      purpose: userObj.purpose,
      showDate: Boolean(userObj.showDate),
      language: userObj.language,
      profileImagePath: userObj.profileImagePath,
      logoPath: userObj.logoPath,
      isPremium: Boolean(userObj.isPremium),
      createdAt: userObj.createdAt,
      updatedAt: userObj.updatedAt
    };
  }
}

module.exports = UserModel;
