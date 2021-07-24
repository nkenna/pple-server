module.exports = mongoose => {
    var schema = mongoose.Schema(
      {
        accountName: { type: String, default: "" },
        accountType: { type: String, default: "" },
        accountNumber: { type: String, default: ""},
        bankName: { type: String, default: "" },
        country: { type: String, default: "" },
        currency: { type: String, default: "" },
        customerId: { type: String, default: "" },
        routingNumber: { type: String, default: "" },
        stripeBankId: { type: String, default: "" },
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'user'},
      },
      {timestamps: true}
    );   

 
    
    schema.method("toJSON", function() {
      const { __v, _id, ...object } = this.toObject();
      object.id = _id;
      return object;
    });
  
    const Bank = mongoose.model("bank", schema);
    return Bank;
  };