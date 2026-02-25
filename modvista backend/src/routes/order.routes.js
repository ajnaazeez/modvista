const express = require('express');
const router = express.Router();
const {
    createOrder,
    getMyOrders,
    getOrderById,
    setPaymentMethod,
    payOrder,
    processReturn,
    cancelOrder
} = require('../controllers/order.controller');
const { protect } = require('../middleware/auth.middleware');

// All routes are protected
router.use(protect);

router.route('/').post(createOrder).get(getMyOrders);
router.get('/my', getMyOrders);
router.get('/:id', getOrderById);
router.patch('/:id/method', setPaymentMethod);
router.patch('/:id/pay', payOrder);
router.post('/:id/return', processReturn);
router.patch('/:id/cancel', cancelOrder);

module.exports = router;
