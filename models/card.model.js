module.exports = mongoose => {
    var schema = mongoose.Schema(
      {
        cardId: { type: String},
        brand: { type: String},
        country: { type: String},
        expiryMonth: { type: Number},
        expiryYear: { type: Number},
        last4: { type: String},
        nameOnCard: {type: String},
        customerId: { type: String},
        isDefault: { type: Boolean, default: false},
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
  
    const Card = mongoose.model("card", schema);
    return Card;
  };