module.exports = mongoose => {
    var schema = mongoose.Schema(
      { 
        accepted: { type: Boolean, default: false},
        followerId: { type: String}, // person following you
        followedId: { type: String}, // person you are following
        follower: { type: mongoose.Schema.Types.ObjectId, ref: 'user'},
        followed: { type: mongoose.Schema.Types.ObjectId, ref: 'user'},
      },
      {timestamps: true}
    );   
    
    
    schema.method("toJSON", function() {
      const { __v, _id, ...object } = this.toObject();
      object.id = _id;
      return object;
    });
  
    const Follow = mongoose.model("follow", schema);
    return Follow;
  };