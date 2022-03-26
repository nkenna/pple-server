module.exports = mongoose => {
    var schema = mongoose.Schema(
      {
        firstname: { type: String},
        lastname: { type: String},
        phone: { type: String},
        username: { type: String},
        email: { type: String},
        password: { type: String},
        avatar: { type: String},
        bio: { type: String, default: 'Welcome to my official PPLE'},
        status: { type: Boolean, default: true }, //activate and deactivate user
        emailNotif: { type: Boolean, default: true }, // true: user recieves email notification
        verified: { type: Boolean, default: false },
        enable2FA: { type: Boolean, default: false },
        followersCount: { type: Number, default: 0},
        followedCount: { type: Number, default: 0},
        hostedEventCount: { type: Number, default: 0},
        isHost: { type: Boolean, default: false },
        stripeCustomerId: { type: String},
        accountId: { type: String},
        type: {type: String, default: "user"}, // user or admin
        events: [{ type: mongoose.Schema.Types.ObjectId, ref: 'event'}],
        cards: [{ type: mongoose.Schema.Types.ObjectId, ref: 'card'}],
        bank: { type: mongoose.Schema.Types.ObjectId, ref: 'bank'},
        connectedaccount: { type: mongoose.Schema.Types.ObjectId, ref: 'connectedaccount'},
        wallet: { type: mongoose.Schema.Types.ObjectId, ref: 'wallet'},
      },
      {timestamps: true}
    );   
    
    
    schema.method("toJSON", function() {
      const { __v, _id, ...object } = this.toObject();
      object.id = _id;
      return object;
    });

    schema.index({ firstname: 'text', lastname: 'text', username: 'text'});
  
    const User = mongoose.model("user", schema);
    return User;
  };