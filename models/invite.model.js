module.exports = mongoose => {
    var schema = mongoose.Schema(
      {
        inviteMsg: {type: String},
        inviterId: { type: String},
        inviteeId: { type: String},
        accepted: { type: Boolean, default: false},
        hostRequested: { type: Boolean, default: false},
        eventId: { type: String},
        event: { type: mongoose.Schema.Types.ObjectId, ref: 'event'},
        inviter: { type: mongoose.Schema.Types.ObjectId, ref: 'user'},
        invitee: { type: mongoose.Schema.Types.ObjectId, ref: 'user'},
      },
      {timestamps: true}
    );   

 
    
    schema.method("toJSON", function() {
      const { __v, _id, ...object } = this.toObject();
      object.id = _id;
      return object;
    });
  
    const Invite = mongoose.model("invite", schema);
    return Invite;
  };