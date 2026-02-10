const Razorpay = require('razorpay');
const crypto = require('crypto');

const{CREDIT_TO_PAISA_MAPPING} = require('../constants/paymentConstants');
const Users = require('../model/users');

const razorpayClient = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const paymentsController = {
    //step-2 from sequence diagram
    createOrder: async (request, response) => {
        try {
            const { credits } = request.body;

            if (!CREDIT_TO_PAISA_MAPPING[credits]) {
                return response.status(400).json({
                    message: "Purchase Credits To Continue!!"
                })
            }

            const amountInPaise = CREDIT_TO_PAISA_MAPPING[credits];

            await razorpayClient.orders.createOrder({
                amount: amountInPaise,
                currency: 'INR',
                receipt: `reciept_${Date.now()}`
            })

            response.status.json({ order: order })
        } catch (error) {
            return response.status(500).json({ message: "Internal Server error" })
        }
    },

    //step-8 from sequence diagram
    verifyOrder: async (request, response) => {
        try {
            const {
                razorpay_order_id, razorpay_payment_id,
                razorpay_signature, credits
            } = request.body;

            const body = razorpay_order_id + '|' + razorpay_payment_id;
            const expectedSignature = crypto
                //create unique digital fingerprint (HMAC) of the secret key
                .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
                //feed both HMAC and body into hasshing function
                .update(body.toString())
                //convert the hashed string into hexadecimal
                .digest('hex');

            if (expectedSignature !== razorpay_signature) {
                return response.status(400).json({ message: "Invalid Transaction!!" })
            }

            const user = await Users.findById({ _id: request.user, _id });
            user.credits += Number(credits);
            await user.save();

            return response.json({ user: user });
        } catch (error) {
            return response.status(500).json({ message: "Internal Server Error" })
        }
    },
};

module.exports = paymentsController;