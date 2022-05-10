module.exports = mongoose => {
    var schema = mongoose.Schema(
      {
        eventId: { type: String},
        senderId: { type: String},
        message: { type: String},
        isJoinChat: { type: Boolean, default: false},
        eventRoomId: { type: String},
        eventroom: { type: mongoose.Schema.Types.ObjectId, ref: 'eventroom'},
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'user'},
        event: { type: mongoose.Schema.Types.ObjectId, ref: 'event'},
      },
      {timestamps: true}
    );   

 
    
    schema.method("toJSON", function() {
      const { __v, _id, ...object } = this.toObject();
      object.id = _id;
      return object;
    });
  
    const Chat = mongoose.model("chat", schema);
    return Chat;
  };