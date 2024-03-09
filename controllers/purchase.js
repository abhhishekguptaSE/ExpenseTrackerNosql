const Razorpay = require('razorpay');
const Order = require('../models/orders')
const userController = require('./users')

const purchasePremium = async (req, res) => {
    try {
        const rzp = new Razorpay({
            key_id: process.env.RZP_KEY_ID,
            key_secret: process.env.RZP_KEY_SECRET,
        });

        const amount = 49900;
        const order = await rzp.orders.create({ amount, currency: "INR" });

        const newOrder = new Order({ orderid: order.id, status: 'PENDING' ,UserId: req.user._id});
        await newOrder.save();

        res.status(201).json({ order, key_id: rzp.key_id });
    } catch (error) {
        console.error(error);
        res.status(403).json({ message: 'Something went wrong', error });
    }
};

const updateTransactionStatus = async (req, res) => {
    try {
        const userId = req.user._id;
        const { payment_id, order_id, status } = req.body;
        const order = await Order.findOne({ orderid: order_id }); // Find order by order_id

        if (status === 'FAILED') {
            // Update order status to FAILED
            await order.updateOne({ status: 'FAILED' });
            return res.status(202).json({ success: true, message: "Transaction Failed" });
        }

        const promise1 = order.updateOne({ paymentid: payment_id, status: 'SUCCESSFUL' });
        const promise2 = req.user.updateOne({ isPremiumUser: true });

        Promise.all([promise1, promise2]).then(() => {
            return res.status(202).json({
                success: true,
                message: "Transaction Successful",
                token: userController.generateAccessToken(userId, undefined, true)
            });
        }).catch((error) => {
            throw new Error(error);
        });

    } catch (err) {
        console.log(err);
        res.status(403).json({ error: err, message: 'Something went wrong' });
    }
};



module.exports = {
    purchasePremium,
    updateTransactionStatus
}
