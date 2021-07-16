module.exports = mongoose => {
    var schema = mongoose.Schema(
      {
        name: { type: String, default: "" },
        email: { type: String, default: "" },
        phone: { type: String, default: "" },
        password: { type: String},
        role: {type: String, default: "admin"}// super admin, manager, admin
      },
      {timestamps: true}
    );   

    
    schema.method("toJSON", function() {
      const { __v, _id, ...object } = this.toObject();
      object.id = _id;
      return object;
    });
  
    const Admin = mongoose.model("admin", schema);
    return Admin;
  };