const express = require('express');
const rbacController = require('../controllers/rbacController');
const authMiddleware = require('../middlewares/authMiddleware');
const authorizeMiddleware = require('../middlewares/authorizeMiddleware');

const router = express.Router();

router.use(authMiddleware.protect);

router.get('/', authorizeMiddleware('user:view'), rbacController.getAllUsers);
router.post('/', authorizeMiddleware('user:create'), rbacController.create);
router.put('/:userId', authorizeMiddleware('user:update'), rbacController.update);
router.delete('/:userId', authorizeMiddleware('user:delete'), rbacController.delete);

module.exports = router;
