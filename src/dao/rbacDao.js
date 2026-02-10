const User = require('../model/users');

const rbacDao = {

    create: async ({ email, name, role, password, adminId }) => {
        const user = new User({
            email,
            password,
            name,
            role,
            adminId
        });
        const created = await user.save();
        return await User.findById(created._id).select('-password');
    },


    update: async ({ userId, adminId, name, role }) => {
        const updatePayload = {};
        if (typeof name === 'string' && name.trim().length > 0) {
            updatePayload.name = name.trim();
        }
        if (typeof role === 'string' && role.trim().length > 0) {
            updatePayload.role = role.trim();
        }

        return await User.findOneAndUpdate(
            { _id: userId, adminId },
            updatePayload,
            { new: true }
        ).select('-password');
    },

    delete: async ({ userId, adminId }) => {
        return await User.findOneAndDelete({ _id: userId, adminId }).select('-password');

    },
    getUsersByAdminId: async (adminId) => {
        return await User.find({ adminId }).select('-password').sort({ name: 1 });
    },
};
module.exports = rbacDao;
