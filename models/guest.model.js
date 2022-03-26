module.exports = mongoose => {
    var schema = mongoose.Schema(
      {
        firstname: { type: String},
        lastname: { type: String},
        phone: { type: String},
        email: { type: String},
        status: { type: Boolean, default: true }, //activate and deactivate user
        verified: { type: Boolean, default: true },
        type: {type: String, default: "guest"},
        orderId: { type: String},
        order: { type: mongoose.Schema.Types.ObjectId, ref: 'order'},
        userId: { type: String},
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'user'},
        eventId: { type: String},
        event: { type: mongoose.Schema.Types.ObjectId, ref: 'event'},
      },
      {timestamps: true}
    );   
    
    
    schema.method("toJSON", function() {
      const { __v, _id, ...object } = this.toObject();
      object.id = _id;
      return object;
    });

    schema.index({ firstname: 'text', lastname: 'text', email: 'text', phone: 'text', orderId: 'text'});
  
    const Guest = mongoose.model("guest", schema);
    return Guest;
  };