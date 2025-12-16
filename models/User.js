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
    unique: true
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

userSchema.index({ phoneNumber: 1 });

const User = mongoose.model('User', userSchema);

class UserModel {
  static async findByPhoneNumber(phoneNumber) {
    return await User.findOne({ phoneNumber });
  }

  static async findById(userId) {
    return await User.findById(userId);
  }

  static async create(userData) {
    const user = new User({
      _id: uuidv4(),
      phoneNumber: userData.phoneNumber,
      name: userData.name || null,
      businessName: userData.businessName || null,
      purpose: userData.purpose || 'personal',
      showDate: userData.showDate !== undefined ? userData.showDate : true,
      language: userData.language || 'english',
      profileImagePath: userData.profileImagePath || null,
      logoPath: userData.logoPath || null,
      isPremium: userData.isPremium || false
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
