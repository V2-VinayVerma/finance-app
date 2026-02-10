const Razorpay = require('razorpay');

const razorpayClient = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const paymentsController = {
    //step-2 from sequence diagram
    createOrder: async (request, response) => {
        try {

        } catch (error) {
            return response.status(500).json({ message: "Internal Server error" })
        }
    },

    //step-8 from sequence diagram
    verifyOrder: async (request, response) => {
        try {

        } catch (error) {
            return response.status(500).json({ message: "Internal Server Error" })
        }
    },
};

module.exports = paymentsController;