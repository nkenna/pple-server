module.exports = mongoose => {
    var schema = mongoose.Schema(
      {
        title: { type: String, default: "", require: true},
        detail: { type: String, default: "" },
        ref: { type: String, default: "", unique: true, require: true },
        creatorId: { type: String, default: "", require: true },
        creatorType: { type: String, default: "", require: true}, // admin or user
        startDate: { type: String, default: "", require: true },
        endDate: { type: String, default: "" },
        maxTickets: { type: Number, default: 0 },
        soldTickets: { type: Number, default: 0 },
        recurring: { type: Boolean, default: false }, // if true, event start date will be resetted automattically
        timeToNextStartDate: { type: Number}, // if recurring, timeToNextStartDate specifies when it will be scheduled again
        timeToNextStartDateType: { type: String, default: "days" }, // if recurring, will it be reschuled in hours, days, weeks, months or years
        paid: { type: Boolean, default: false, require: true }, // true or false. this cannot be changed and all tickets under it must be paid or not
        headerImage: { type: String, default: "https://backend.dakowa.com/media-header/dakowa_back.jpg" },
        status: { type: Boolean, default: true }, //activate and deactivate status
        virtual: { type: Boolean, default: true },
        virtualPlatform: { type: String, default: "" },
        virtualLink: { type: String, default: "" },
        eventInviteLink: { type: String, default: "" },
        tickets: [{ type: mongoose.Schema.Types.ObjectId, ref: 'ticket'}],
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'user'},
        admin: { type: mongoose.Schema.Types.ObjectId, ref: 'admin'},
        location: { type: mongoose.Schema.Types.ObjectId, ref: 'location'},
      },
      {timestamps: true}
    );   
    
    
    schema.method("toJSON", function() {
      const { __v, _id, ...object } = this.toObject();
      object.id = _id;
      return object;
    });

    schema.index({ title: 'text', detail: 'text'});
  
    const Event = mongoose.model("event", schema);
    return Event;
  };