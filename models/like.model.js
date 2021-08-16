module.exports = mongoose => {
    var schema = mongoose.Schema(
      {
        eventId: { type: String, default: "" },
        userId: { type: String, default: "" },
        event: { type: mongoose.Schema.Types.ObjectId, ref: 'event'},
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'user'},
      },
      {timestamps: true}
    );   
    
    
    schema.method("toJSON", function() {
      const { __v, _id, ...object } = this.toObject();
      object.id = _id;
      return object;
    });
  
    const Like = mongoose.model("like", schema);
    return Like;
  };