const path = require("path");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const User = require("./User");

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
    name: "Dilan",
    phone: "8172719930",
    password: "dilan99",
    status: "none",
    currentActivity: "none",
    friends: [],
  },
  {
    name: "Viran",
    phone: "8173081780",
    password: "dilan99",
    status: "none",
    currentActivity: "none",
    friends: [],
  },
  {
    name: "Nina",
    phone: "8174231550",
    password: "dilan99",
    status: "none",
    currentActivity: "none",
    friends: [],
  },
  {
    name: "Sam",
    phone: "8172729930",
    password: "dilan99",
    status: "none",
    currentActivity: "none",
    friends: [],
  },
  {
    name: "Shivi",
    phone: "8172739930",
    password: "dilan99",
    status: "none",
    currentActivity: "none",
    friends: [],
  },
];

(async () => {
  await connect(process.env.MONGODB_URI);
  for (let i = 0; i < data.length; i++) {
    const password = bcrypt.hash(data[i].password, 10);
    const user = new User({
      name: `${data[i].name}`,
      phone: `${data[i].phone}`,
      password: (await password).toString(),
      status: data[i].status,
      currentActivity: data[i].currentActivity,
      friends: data[i].friends,
    });
    await user.save();
  }

  //case number: 101738248835

  console.log("***Generated Users!");
  process.exit(0);
})();
