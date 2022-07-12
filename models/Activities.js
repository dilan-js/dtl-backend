const { model, Schema } = require("mongoose");
const ObjectId = require("mongodb").ObjectId;

/**
 * Customer Schema
 * @private
 */

const activitySchema = new Schema(
  {
    title: {
      type: String,
      default: "",
      trim: true,
      required: true,
    },
    numberOfTimesSelected: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

const Activity = model("Activity", activitySchema);

/**
 * @typedef Activity
 */
module.exports = Activity;
