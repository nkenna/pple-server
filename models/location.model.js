module.exports = mongoose => {
    var schema = mongoose.Schema(
      {
        country: { type: String, default: "" },
        state: { type: String, default: "" },
        city: { type: String, default: "" },
        address: { type: String, default: "" },
        landmark: { type: String, default: "" },
        lat: { type: Number, default: 0 },
        lon: { type: Number, default: 0 },
        userId: { type: String, default: "" },
        eventId: { type: String, default: "" },
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

    schema.index({ country: 'text', state: 'text', city: 'text', address: 'text'});
  
    const Location = mongoose.model("location", schema);
    return Location;
  };