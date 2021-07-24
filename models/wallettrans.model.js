module.exports = mongoose => {
    var schema = mongoose.Schema(
      {
        walletRef: { type: String, default: "" },
        amount: { type: Number, default: 0.0 },
        commission: { type: Number, default: 0.0 },
        status: { type: String, default: "" }, //success, pending, failed, cancelled
        channel: { type: String, default: "" }, // card, transfer, ussd,
        type: { type: String, default: "" }, // TIP, PAYOUT, EVENT
        payerEmail: { type: String, default: "" },   
        chargeId: { type: String, default: "" },  
        payoutId: { type: String, default: "" },  
        wallet: { type: mongoose.Schema.Types.ObjectId, ref: 'wallet'},    
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'user'},
      },
      {timestamps: true}
    );   
    
    schema.method("toJSON", function() {
      const { __v, _id, ...object } = this.toObject();
      object.id = _id;
      return object;
    });
  
    const WalletTrans = mongoose.model("wallettrans", schema);
    return WalletTrans;
  };