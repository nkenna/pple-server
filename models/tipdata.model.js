module.exports = mongoose => {
    var schema = mongoose.Schema(
      {
        email: { type: String, default: "" },
        amount: { type: Number, default: 0.0 },
        status: { type: String, default: "" }, //success, pending, failed, cancelled  
        chargeId: { type: String, default: "" },    
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'user'},
        host: { type: mongoose.Schema.Types.ObjectId, ref: 'user'},
      },
      {timestamps: true}
    );   
    
    schema.method("toJSON", function() {
      const { __v, _id, ...object } = this.toObject();
      object.id = _id;
      return object;
    });

    schema.index({ email: 'text', chargeId: 'text'});
  
    const TipData = mongoose.model("tipdata", schema);
    return TipData;
  };