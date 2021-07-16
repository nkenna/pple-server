module.exports = mongoose => {
    var schema = mongoose.Schema(
      {
        code: { type: String, default: "" },
        used: { type: Boolean, default: false },
        email: { type: String, default: "" },
        userId: {type: String, default: ""},
      },
      {timestamps: true}
    );   
    
    schema.method("toJSON", function() {
      const { __v, _id, ...object } = this.toObject();
      object.id = _id;
      return object;
    });
  
    const ResetCode = mongoose.model("resetcode", schema);
    return ResetCode;
  };