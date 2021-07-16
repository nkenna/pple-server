module.exports = mongoose => {
    var schema = mongoose.Schema(
      {
        code: { type: String, default: "" },
        email: { type: String, default: "" },
        userId: {type: String, default: ""},
        used: { type: Boolean, default: false },
      },
      {timestamps: true}
    );   
    
    schema.method("toJSON", function() {
      const { __v, _id, ...object } = this.toObject();
      object.id = _id;
      return object;
    });
  
    const VerifyCode = mongoose.model("verifycode", schema);
    return VerifyCode;
  };