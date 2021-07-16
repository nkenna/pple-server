module.exports = mongoose => {
    var schema = mongoose.Schema(
      {
        firstname: { type: String, default: "" },
        lastname: { type: String, default: "" },
        phone: { type: String, default: "" },
        email: { type: String, default: "" },
        status: { type: Boolean, default: true }, //activate and deactivate user
        verified: { type: Boolean, default: true },
        type: {type: String, default: "guest"},
        userId: { type: String, default: "" },
        event: { type: mongoose.Schema.Types.ObjectId, ref: 'event'},
      },
      {timestamps: true}
    );   
    
    
    schema.method("toJSON", function() {
      const { __v, _id, ...object } = this.toObject();
      object.id = _id;
      return object;
    });

    schema.index({ firstname: 'text', lastname: 'text', email: 'text'});
  
    const Guest = mongoose.model("guest", schema);
    return Guest;
  };