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

            if (!name || !email || !role) {
                return response.status(400).json({
                    message: 'Name, email and role are required'
                });
            }

            if (!Object.values(USER_ROLES).includes(role)) {
                return response.status(400).json({
                    message: 'Invalid Role'
                });
            }

            const tempPassword = generateTemporaryPassword(8);
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(tempPassword, salt);

            const user = await rbacDao.create({
                email: email.trim().toLowerCase(),
                name: name.trim(),
                role,
                password: hashedPassword,
                adminId: adminUser.adminId
            });


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
            if (error?.code === 11000) {
                return response.status(400).json({ message: 'Email already exists' });
            }
            response.status(500).json({ message: "Internal Server Error" });

        }

    },
    update: async (request, response) => {
        try {
            const { userId } = request.params;
            const { name, role } = request.body;

            if (role && !Object.values(USER_ROLES).includes(role)) {
                return response.status(400).json({
                    message: 'Invalid Role'
                });
            }

            const user = await rbacDao.update({
                userId,
                name,
                role,
                adminId: request.user.adminId
            });

            if (!user) {
                return response.status(404).json({ message: 'User not found' });
            }

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
            const { userId } = request.params;
            const deletedUser = await rbacDao.delete({
                userId,
                adminId: request.user.adminId
            });

            if (!deletedUser) {
                return response.status(404).json({ message: 'User not found' });
            }

            return response.status(200).json({
                message: "User Deleted!!",
                user: deletedUser
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
                users
            });
        } catch (error) {
            console.error(error);
            response.status(500).json({ message: "Internal Server Error" });
        }
    }
}


module.exports = rbacController;
