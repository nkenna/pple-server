module.exports = mongoose => {
    var schema = mongoose.Schema(
      {
        eventId: { type: String},
        lastChat: { type: mongoose.Schema.Types.ObjectId, ref: 'chat'},
        chats: [{ type: mongoose.Schema.Types.ObjectId, ref: 'chat'}],
        event: { type: mongoose.Schema.Types.ObjectId, ref: 'event'},
      },
      {timestamps: true}
    );   

 
    
    schema.method("toJSON", function() {
      const { __v, _id, ...object } = this.toObject();
      object.id = _id;
      return object;
    });
  
    const EventRoom = mongoose.model("eventroom", schema);
    return EventRoom;
  };