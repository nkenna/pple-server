module.exports = mongoose => {
    var schema = mongoose.Schema(
      {
        token: { type: String},
        deviceModel: { type: String},
        os: { type: String},
        userId: { type: String},
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'user'},
      },
      {timestamps: true}
    );   

    
    schema.method("toJSON", function() {
      const { __v, _id, ...object } = this.toObject();
      object.id = _id;
      return object;
    });
  
    const Device = mongoose.model("device", schema);
    return Device;
  };