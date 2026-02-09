const express = require('express');
const rbacController = require('../controllers/rbacController');
const authMiddleware = require('../middlewares/authMiddleware');
const authorizeMiddleware = require('../middlewares/authorizeMiddleware');

const router = express.Router();

router.use(authMiddleware.protect);

router.post('/', authorizeMiddleware('user:create'), rbacController.create);
router.post('/', authorizeMiddleware('user:update'), rbacController.update);
router.post('/delete', authorizeMiddleware('user:delete'), rbacController.delete);
router.post('/', authorizeMiddleware('user:read'), rbacController.getAllUsers);

module.exports = router;