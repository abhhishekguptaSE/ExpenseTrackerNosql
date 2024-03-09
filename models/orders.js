const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const orderSchema = new Schema({
  paymentid: {
    type: String,
  },
  orderid: {
    type: String,
  },
  status: {
    type: String,
  },
  UserId: {
    type: Schema.Types.ObjectId,
    ref: "Users", // Use the correct model name here
  },
});
const Order = mongoose.model("Order", orderSchema);

module.exports = Order;
// module.exports = Order;
