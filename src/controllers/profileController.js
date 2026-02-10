const userDao = require("../dao/userDao");

const usersController = {
    getUserInfo: async (request, response) => {
        try {
            const userEmail = request.user.email;
            const user = await userDao.findByEmail(userEmail);

            return response.json({ user: user })
        } catch (error) {
            return response.status(500).json({ message: "Internal Server Error!" })
        }
    }
}

module.exports = usersController;
