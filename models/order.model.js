module.exports = mongoose => {
  var schema = mongoose.Schema(
    {
      eventId: {type: String },
      orderRef: { type: String },
      transDate: { type: String },
      chargeId: { type: String },
      stripeAmount: { type: Number, default: 0 },
      stripePaymentMethod : { type: String },
      stripeCustomerId: { type: String },
      paymentCardId: { type: String },
      stripeStatus: { type: String },
      stripePaid: { type: Boolean },
      status: { type: String }, // success, pending, cancelled
      quantity: { type: Number, default: 1 },
      total: { type: Number, default: 0 },
      charges: { type: Number, default: 0 },
      vat: { type: Number, default: 0 },
      vatAmount: { type: Number, default: 0 },
      pricePerQty: { type: Number, default: 0 },
      hostTip: { type: Number, default: 0 },
      appliedTip: { type: Boolean, default: false },
      subTotal: { type: Number, default: 0 },
      userId: {type: String},
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'user'},
      event: { type: mongoose.Schema.Types.ObjectId, ref: 'event' },
      paymentCard: { type: mongoose.Schema.Types.ObjectId, ref: 'card' },
      guests: [{ type: mongoose.Schema.Types.ObjectId, ref: 'guest' }]
    },
    {timestamps: true}
  )

  schema.method('toJSON', function() {
    const { __v, _id, ...object } = this.toObject();
    object.id = _id;
    return object;
  });

  const Order = mongoose.model('order', schema);
  return Order;
};