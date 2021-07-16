module.exports = mongoose => {
    var schema = mongoose.Schema(
      {
        title: { type: String, default: "", require: true },
        detail: { type: String, default: "" },
        ref: { type: String, default: "", unique: true, require: true },
        creatorId: { type: String, default: "", require: true },
        eventId: { type: String, default: "" },
        amount: { type: Number, default: 0 },
        startDate: { type: String, default: "", require: true },
        endDate: { type: String, default: "" },
        paid: { type: Boolean, default: false, require: true }, // true or false. this cannot be changed and all tickets under it must be paid or not
        status: { type: Boolean, default: true }, //activate and deactivate user
        event: { type: mongoose.Schema.Types.ObjectId, ref: 'event'},
        ticket: { type: mongoose.Schema.Types.ObjectId, ref: 'ticket'},
      },
      {timestamps: true}
    );   
    
    
    schema.method("toJSON", function() {
      const { __v, _id, ...object } = this.toObject();
      object.id = _id;
      return object;
    });

    schema.index({ title: 'text', detail: 'text'});
  
    const ChildTicket = mongoose.model("childticket", schema);
    return ChildTicket;
  };