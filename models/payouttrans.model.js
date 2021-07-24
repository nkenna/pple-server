module.exports = mongoose => {
    var schema = mongoose.Schema(
      {
        walletRef: { type: String, default: "" },
        amount: { type: Number, default: 0.0 },
        status: { type: String, default: "" }, //success, pending, failed, cancelled
        channel: { type: String, default: "" }, // card, transfer, ussd,
        chargeId: { type: String, default: "" },  
        payoutId: { type: String, default: "" },    
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'user'},
        admin: { type: mongoose.Schema.Types.ObjectId, ref: 'admin'},
      },
      {timestamps: true}
    );   
    
    schema.method("toJSON", function() {
      const { __v, _id, ...object } = this.toObject();
      object.id = _id;
      return object;
    });
  
    const PayoutTrans = mongoose.model("payouttrans", schema);
    return PayoutTrans;
  };