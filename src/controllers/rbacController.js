const rbacDao = require("../dao/rbacDao");
const bcrypt = require('bcryptjs')
const { generateTemporaryPassword } = require('../utility/passwordUtil');
const emailService = require('../services/emailService');
const { USER_ROLES } = require("../utility/userRoles");

const rbacController = {
    create: async (request, response) => {
        try {
            const adminUser = request.user;
            const { name, email, role } = request.body;


            if (!USER_ROLES.include(role)) {
                return response.status(400).json({
                    message: 'Invalid ROle'
                });
            }
            
            const tempPassword = generateTemporaryPassword(8);
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(tempPassword, salt);

            const user = await rbacDao.create(email, name, role, hashedPassword, adminUser._id);


            //send temporary password in email
            try {
                await emailService.send(
                    email, 'Temporary Password',
                    `Your Temporary Password is: ${tempPassword}`
                )
            } catch (error) {
                console.log(error);
            }

            return response.status(200).json({
                message: "User Created!!",
                user: user
            });
        } catch (error) {
            console.error(error);
            response.status(500).json({ message: "Internal Server Error" });

        }

    },
    update: async (request, response) => {
        try {
            const { name, role, userId } = request.body;
            const user = await rbacDao.update(userId, name, role);

            return response.status(200).json({
                message: "User Updated!!",
                user: user
            });
        } catch (error) {
            console.error(error);
            response.status(500).json({ message: "Internal Server Error" });
        }
    },
    delete: async (request, response) => {
        try {
            const { userId } = request.body;
            await rbacDao.delete(userId);

            return response.status(200).json({
                message: "User Deleted!!",
                user: user
            });
        } catch (error) {
            console.error(error);
            response.status(500).json({ message: "Internal Server Error" });
        }
    },
    getAllUsers: async (request, response) => {
        try {
            const adminId = request.user.adminId;
            const users = await rbacDao.getUsersByAdminId(adminId);

            return response.status(200).json({
                user: users
            });
        } catch (error) {
            console.error(error);
            response.status(500).json({ message: "Internal Server Error" });
        }
    }
}


module.exports = rbacController;