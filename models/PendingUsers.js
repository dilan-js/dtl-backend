const { model, Schema } = require("mongoose");
const ObjectId = require("mongodb").ObjectId;

/**
 * Customer Schema
 * @private
 */

const pendingUserSchema = new Schema(
  {
    phone: {
      type: String,
      default: "",
      trim: true,
      required: true,
    },
    invitedBy: {
      type: ObjectId,
      ref: "User",
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

const PendingUser = model("PendingUser", pendingUserSchema);

/**
 * @typedef PendingUser
 */
module.exports = PendingUser;
