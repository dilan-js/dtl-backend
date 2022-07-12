const { model, Schema } = require("mongoose");
const ObjectId = require("mongodb").ObjectId;

/**
 * Customer Schema
 * @private
 */

const userSchema = new Schema(
  {
    name: {
      type: String,
      default: "",
      trim: true,
      required: true,
    },
    phone: {
      type: String,
      default: "",
      trim: true,
      required: true,
    },
    password: {
      type: String,
      trim: true,
      required: true,
    },
    status: {
      type: String,
      trim: true,
      required: true,
      default: "none",
    },
    currentActivity: {
      type: String,
      trim: true,
      required: true,
      default: "none",
    },
    invitedBy: {
      type: ObjectId,
      ref: "User",
      trim: true,
    },
    timeSinceLastUpdate: {
      type: Date,
      default: Date.now(),
    },
    friends: {
      type: [
        {
          type: ObjectId,
          ref: "User",
        },
      ],
    },
  },
  {
    timestamps: true,
  }
);

const User = model("User", userSchema);

/**
 * @typedef User
 */
module.exports = User;
