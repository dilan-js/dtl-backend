const path = require("path");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const Activity = require("./Activities");

const defaultOptions = {
  useFindAndModify: false,
  useNewUrlParser: true,
  useCreateIndex: true,
  useUnifiedTopology: true,
};

const connect = (url) => {
  return mongoose.connect(url, {
    ...defaultOptions,
  });
};

const data = [
  {
    title: "Coffee/Drink",
  },
  {
    title: "Food",
  },
  {
    title: "Hang Out",
  },
  {
    title: "Go Out/Party",
  },
  {
    title: "Talk(Phone/Text/FaceTime)",
  },
];

(async () => {
  await connect(process.env.MONGODB_URI);
  for (let i = 0; i < data.length; i++) {
    const activity = new Activity({
      title: `${data[i].title}`,
    });
    await activity.save();
  }

  console.log("***Generated Activities!");
  process.exit(0);
})();
