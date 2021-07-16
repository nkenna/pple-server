module.exports = mongoose => {
    var schema = mongoose.Schema(
      {
        firstname: { type: String, default: "" },
        lastname: { type: String, default: "" },
        phone: { type: String, default: "" },
        email: { type: String, default: "" },
        password: { type: String, default: "" },
        avatar: { type: String, default: "https://backend.dakowa.com/media-header/african.png" },
        status: { type: Boolean, default: true }, //activate and deactivate user
        emailNotif: { type: Boolean, default: true }, // true: user recieves email notification
        verified: { type: Boolean, default: false },
        isHost: { type: Boolean, default: false },
        hostTip: { type: Number, default: 5 }, // default tip amount is $5
        type: {type: String, default: "user"}, // user or admin
        events: [{ type: mongoose.Schema.Types.ObjectId, ref: 'event'}],
      },
      {timestamps: true}
    );   
    
    
    schema.method("toJSON", function() {
      const { __v, _id, ...object } = this.toObject();
      object.id = _id;
      return object;
    });

    schema.index({ firstname: 'text', lastname: 'text', email: 'text'});
  
    const User = mongoose.model("user", schema);
    return User;
  };