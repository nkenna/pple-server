module.exports = mongoose => {
    var schema = mongoose.Schema(
      {
        accountId: { type: String, default: "" },
        name: { type: String, default: "" },
        accountType: { type: String, default: ""},
        country: { type: String, default: "" },
        currency: { type: String, default: "" },
        email: { type: String, default: "" },
        loginUrl: { type: String, default: "" },
        created: {type: Number},
        timeZone: { type: String, default: "" },
        userId: { type: String},
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'user'},
      },
      {timestamps: true}
    );   

 
    
    schema.method("toJSON", function() {
      const { __v, _id, ...object } = this.toObject();
      object.id = _id;
      return object;
    });
  
    const ConnectedAccount = mongoose.model("connectedaccount", schema);
    return ConnectedAccount;
  };

