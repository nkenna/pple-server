module.exports = mongoose => {
  
    var schema = mongoose.Schema(
      {
        walletRef: { type: String, default: "" },
        balance: { type: Number, default: 0.0 },
        userId: { type: String, default: ""},
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'user'},
        wallettrans: [{ type: mongoose.Schema.Types.ObjectId, ref: 'wallettrans'}],
      },
      {timestamps: true}
    );  
    
    schema.method("toJSON", function() {
      const { __v, _id, ...object } = this.toObject();
      object.id = _id;
      return object;
    });

    schema.index({ walletRef: 'text'});
  
    const Wallet = mongoose.model("wallet", schema);
    return Wallet;
  };