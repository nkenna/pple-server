module.exports = mongoose => {
    var schema = mongoose.Schema(
      {
        type: {type: String}, // invite, follow request, follow accept, message, order, refund, payout, invite request
        message: { type: String},
        read: { type: Boolean, default: false},

        ownerId: { type: String},
        owner: { type: mongoose.Schema.Types.ObjectId, ref: 'user'},


        inviteeId: { type: String},
        inviterId:  { type: String}, 

        followerId: {type: String},
        follower: { type: mongoose.Schema.Types.ObjectId, ref: 'user'},

        followedId: {type: String},
        followered: { type: mongoose.Schema.Types.ObjectId, ref: 'user'},

        followId: { type: String},
        follow: { type: mongoose.Schema.Types.ObjectId, ref: 'follow'},

        eventId: { type: String},
        event: { type: mongoose.Schema.Types.ObjectId, ref: 'event'},

        inviteId: {type: String},
        invite: { type: mongoose.Schema.Types.ObjectId, ref: 'invite'},

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
  
    const Notification = mongoose.model("notification", schema);
    return Notification;
  };