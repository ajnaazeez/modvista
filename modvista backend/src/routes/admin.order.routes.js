const express = require('express');
const router = express.Router();
const { getAllOrders, getOrderByIdAdmin, updateOrderStatus, approveReturn, rejectReturn, migrateOrderStatuses, deleteOrder } = require('../controllers/admin.order.controller');
const { protect } = require('../middleware/auth.middleware');
const adminOnly = require('../middleware/admin.middleware');

router.post('/orders/migrate-statuses', protect, adminOnly, migrateOrderStatuses);
router.get('/orders', protect, adminOnly, getAllOrders);
router.get('/orders/:id', protect, adminOnly, getOrderByIdAdmin);
router.patch('/orders/:id/status', protect, adminOnly, updateOrderStatus);
router.patch('/orders/:id/return/approve', protect, adminOnly, approveReturn);
router.patch('/orders/:id/return/reject', protect, adminOnly, rejectReturn);
router.delete('/orders/:id', protect, adminOnly, deleteOrder);

module.exports = router;
