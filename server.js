require("dotenv").config();
const bodyParser = require("body-parser");
const cors = require("cors");
const express = require("express");
const path = require("path");
const mongoose = require("mongoose");
const ObjectId = require("mongodb").ObjectId;

// const fileupload = require("express-fileupload");
const http = require("http");
const { app } = require("firebase-admin");
const { error } = require("console");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const CronJob = require("cron").CronJob;

const User = require("./models/User");
const Activity = require("./models/Activities");
const PendingUser = require("./models/PendingUsers");
const {
  ActivityContext,
} = require("twilio/lib/rest/taskrouter/v1/workspace/activity");

//ADD TRY CATCH TO ALL MAJOR BLOCKS DILAN!!!!

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

const run = async () => {
  // Connect to DB
  await connect(process.env.MONGODB_URI);
  console.log("Connected to DB");

  /** Instantiate Server */
  const app = express();

  /** Core Middlewares */
  app.use(cors());
  app.use(
    bodyParser.json({
      limit: "50mb",
    })
  );
  app.use(
    bodyParser.urlencoded({
      limit: "50mb",
      parameterLimit: 100000,
      extended: true,
    })
  );
  //   app.use(fileupload());

  /** Passport Middleware Initialization */
  //   PassportMiddleware.initialize(app);

  //keep both commented in prior to pushing!
  //   app.use(express.static(path.join(__dirname, "flip-frontend/build")));

  //   app.get("*", (req, res) => {
  //     res.sendFile(path.join(__dirname, "/flip-frontend/build/index.html"));
  //   });

  //   app.use(router);

  /** Start Http Server */
  const port1 = process.env.PORT1 || 80;
  //   var httpServer = http.createServer(app);

  app.listen(port1, () => {
    console.log(`Listening on port ${port1}`);
  });

  //   http
  //     .createServer(function (req, res) {
  //       res.writeHead(301, { Location: "https://" + req.headers.host + req.url });
  //       res.end();
  //     })
  //     .listen(port1);

  var job = new CronJob(
    "*/2 * * * *",
    async function () {
      console.log("You will see this message every minute");
      const users = await User.find();

      users.forEach(async (user) => {
        //cron job to update the status of everyone
        const curr = await User.findOne({ _id: user._id });

        const timeLastUpdate = curr.timeSinceLastUpdate;
        var diff = Math.abs(new Date(timeLastUpdate) - Date.now());
        var minutes = Math.floor(diff / 1000 / 60);
        if (minutes < 1) {
          await User.findOneAndUpdate(
            { _id: curr._id },
            {
              $set: {
                status: "active",
                timeLastUpdate: Date.now(),
              },
            },
            { new: true }
          ).exec();
        } else {
          //we need to set them to inactive
          //does this update with the time they were last updated??
          // console.log("IM IN THe ELSE");
          await User.findOneAndUpdate(
            { _id: curr._id },
            {
              $set: {
                status: "inactive",
                timeLastUpdate: curr.timeLastUpdate,
              },
            },
            { new: true }
          ).exec();
          // console.log({ curr });
        }
      });
    },
    null,
    true,
    "America/Los_Angeles"
  );

  app.post("/signup", async (req, res) => {
    // console.log(req.body);
    try {
      const { name, phone, password } = req.body;
      if (
        name.length == 0 ||
        name == null ||
        phone.length == 0 ||
        phone == null ||
        password.length == 0 ||
        password == null
      ) {
        res.status(400).send({ msg: "All fields must be filled!" });
      }
      const hashedPassword = bcrypt.hash(password, 10);
      var savedUser = new User({
        name,
        phone,
        password: (await hashedPassword).toString(),
      });
      if (await savedUser.save()) {
        const accessToken = jwt.sign(
          savedUser.toJSON(),
          process.env.JWT_SECRET
        );
        console.log({ accessToken });
        res.json({ accessToken, savedUser: savedUser.toJSON() });
      } else {
        throw error;
      }
    } catch (e) {
      console.log(e);
      res.redirect("/register");
    }
  });

  const authenticateToken = (req, res, next) => {
    const authHeader = req.headers["authorization"];
    console.log({ authHeader });
    const token = authHeader && authHeader.split(" ")[1];
    if (token == null) {
      //not sent a token to  us
      return res.sendStatus(401);
    }
    jwt.verify(token, process.env.JWT_SECRET, async (err, savedUser) => {
      //we see you have token but it's invalid
      if (err) return res.sendStatus(403);

      //else is valid token
      let currentUser = await User.findOne({ _id: savedUser._id });
      if (currentUser != null) {
        req.savedUser = currentUser;
        next();
      }
    });
  };

  app.post("/login", async (req, res) => {
    console.log(req.body);
    const { phone, password } = req.body;
    try {
      if (
        (phone.length <= 0 && password.length <= 0) ||
        phone.length <= 0 ||
        password.length <= 0
      ) {
        throw error;
      } else {
        var foundUser = await User.find({ phone });
        foundUser = foundUser[0];
        console.log(foundUser);

        // if(foundUser.password == password){
        // }
        //PREVENT SAME NUMBER REGISTERING!!
        bcrypt.compare(password, foundUser.password, async (err, response) => {
          if (err) {
            console.log({ err });
            throw err;
          }
          if (response) {
            console.log({ response });
            const accessToken = jwt.sign(
              foundUser.toJSON(),
              process.env.JWT_SECRET
            );
            let foundFriends = [];
            for (let i = 0; i < foundUser.friends.length; i++) {
              let foundFriend = await User.find({
                _id: foundUser.friends[i].toJSON(),
              });
              foundFriend = foundFriend[0];

              foundFriends.push(foundFriend);
            }
            res.json({
              foundUser: foundUser,
              accessToken: accessToken,
              foundFriends,
            });
          }
        });
      }
    } catch (error) {
      console.log("hit error" + error);
      res.status(500).send({ message: "BOO" });
    }
  });

  // Receives: user id and jwt token
  // Sends: First Name, Last Name, Phone Number, # of friends
  app.get("/getProfile/:id", authenticateToken, async (req, res) => {
    console.log(req.params.id);
    let _id = req.savedUser._id;
    let currentUser = await User.findOne({
      _id,
    });
    const { name, phone, friends } = currentUser;
    currentUser = { _id: currentUser._id, name, phone, friends };

    res.json({ currentUser });
  });

  const options = [
    {
      id: 1,
      title: "Coffee/Drink",
    },
    {
      id: 2,
      title: "Food",
    },
    {
      id: 3,
      title: "Hang Out",
    },
  ];
  // Receives: user's desired activity
  // Sends: returns success if updated
  app.post("/selectActivity", async (req, res) => {
    let { _id, desiredActivity, status } = req.body;
    status = "active";
    console.log({ desiredActivity });
    console.log({ status });
    //need to first find the activity, update the # of times selected, validate it exists
    //then set it in 219
    const userSelectedActivity = await Activity.findOne({
      _id: desiredActivity._id,
    });
    if (userSelectedActivity != null) {
      //valid activity
      const validDesiredActivity = await Activity.findOneAndUpdate(
        { _id: userSelectedActivity._id },
        { $inc: { numberOfTimesSelected: 1 } },
        { new: true }
      );

      const currentUser = await User.findOneAndUpdate(
        { _id },
        {
          $set: {
            currentActivity: desiredActivity.title,
            status: status,
            timeSinceLastUpdate: Date.now(),
          },
        },
        { new: true }
      ).exec();
      //  console.log({ currentUser });
      res.json({ currentUser, validDesiredActivity });
    }
  });

  // Receives: user's cancellation request
  // Sends: returns success if updated
  app.post("/cancelStatus", async (req, res) => {
    let { _id, status, desiredActivity } = req.body;
    status = "inactive";
    desiredActivity = "none";
    await User.findOneAndUpdate(
      { _id },
      { $set: { currentActivity: desiredActivity, status: status } }
    ).exec(function (err, response) {
      if (err) {
        console.log(err);
        res.status(500).send(err);
      }
    });
    const currentUser = await User.find({ _id });
    res.json(currentUser[0]);
    console.log("hello world");
  });

  // Receives: phone number of friend, user ID, token
  // Sends: returns success and adds friend to 'pending user' database
  //if the user exists within the system, automatically. else put in pending
  // till the user signs up with us.
  // app.post("/addFriend", async (req, res) => {
  //   //add existing user.
  //   const { _id, friendPhoneNumber } = req.body;
  //   let currentUser = await User.findOne({ _id });
  //   let addedFriend = await User.findOne({ phone: friendPhoneNumber });
  //   let mutualFriends = [];
  //   //friend is in the system
  //   if (addedFriend != null && addedFriend.friends.includes(currentUser._id)) {
  //     console.log("ADDED FRIEND EXISTS AND IS MUTUAL");
  //     //friend needs to add the user as well. --> for now, we can just add to both this way.
  //     //check if the friend has also added the user.
  //     //let addedFriendsFriends = addedFriend.friends;
  //     //if (addedFriendsFriends.includes(currentUser._id)) {
  //     //the friend has added the user as well
  //     await User.updateOne(
  //       { _id: currentUser._id }, // query matching , refId should be "ObjectId" type
  //       { $addToSet: { friends: addedFriend } } //single object will be pushed to attachemnts
  //     );

  //     //find all friends where there is a mutual addition
  //     let friendsUserAdded = currentUser.friends;
  //     var process = friendsUserAdded.map(async function (friend) {
  //       console.log({ friend });
  //       let mutualFriend = await User.findOne({ _id: friend._id });
  //       return new Promise(function (resolve, reject) {
  //         mutualFriends.push({ ...mutualFriend }); // You will create a copy here.
  //         resolve();
  //       });
  //     });

  //     Promise.all(process).then(function () {
  //       mutualFriends = mutualFriends.map((mutualFriend) => {
  //         console.log(mutualFriend);
  //         return {
  //           name: mutualFriend._doc.name,
  //           phone: mutualFriend._doc.phone,
  //         };
  //       });
  //     });
  //     //}
  //   } else {
  //     //add a friend to a pending set
  //     console.log("HEYOOOOOOOOO");
  //     var pendingUser;
  //     if (addedFriend == null) {
  //       //user does not exist in user collection
  //       //check if user is already pending
  //       const existingAddedPendingUser = await PendingUser.findOne({
  //         phone: friendPhoneNumber,
  //       });
  //       //pending user DNE
  //       if (existingAddedPendingUser == null) {
  //         pendingUser = new PendingUser({
  //           phone: friendPhoneNumber,
  //           invitedBy: currentUser._id,
  //         });
  //         console.log({ pendingUser });
  //         pendingUser.save();
  //       } //else the friend has already been addeds
  //       else {
  //         pendingUser = await PendingUser.findOne({ phone: friendPhoneNumber });
  //       }
  //     }
  //   }

  //   //find friends added to user that are in pending user collection
  //   //look at a users friends list and select only ones found in pending
  //   //DO THIS LATER
  //   const updatedUser = await User.findOne({ _id: currentUser._id });
  //   const pendingFriends = await PendingUser.find(
  //     {
  //       invitedBy: currentUser._id,
  //     },
  //     { phone: 1, _id: 0 }
  //   );

  //   console.log({ pendingFriends });
  //   console.log({ mutualFriends });
  //   res.json({ currentUser: updatedUser, pendingFriends, mutualFriends });
  // });

  //delete the duplicate attempts

  app.post("/addFriend", async (req, res) => {
    const { _id, friendPhoneNumber } = req.body;
    var currentUser = await User.findOne({ _id: ObjectId(_id) }).populate(
      "friends"
    );
    console.log({ currentUser });
    if (currentUser.phone === friendPhoneNumber) {
      console.log("WE FOUDN AN PROBLEM");
      res.status(400).send({ msg: "Cannot add yourself as a friend" });
    } else {
      var pendingFriends;
      //check if added friend is already registered user
      var addedFriend = await User.findOne({ phone: friendPhoneNumber });
      //if the added friend DNE, immediately make them pending
      if (addedFriend == null) {
        //create pending user by current user
        let pendingUser = new PendingUser({
          phone: friendPhoneNumber,
          invitedBy: currentUser._id,
        });
        await pendingUser.save();
      } else {
        //added friend is not null
        //now check if both users have been added as pending by each other
        // var currentUserInvitedPerson = await PendingUser.findOne({
        //   invitedBy: currentUser._id,
        //   phone: friendPhoneNumber,
        // });
        var personInvitedCurrentUser = await PendingUser.findOne({
          invitedBy: addedFriend._id,
          phone: currentUser.phone,
        });
        if (personInvitedCurrentUser == null) {
          console.log("This connection is not yet mutual");
          //both pending documents exist
          //they have not mutually added each other.
          //current user is the only one who's added
          //create pending user
          let pendingUser = new PendingUser({
            phone: friendPhoneNumber,
            invitedBy: currentUser._id,
          });
          await pendingUser.save();
        } else if (personInvitedCurrentUser != null) {
          //both are pending, both exist as users
          //update both users' user document, remove their pending documents
          console.log(
            "This pending connection is about to become mutual and no longer pending"
          );
          await User.updateOne(
            { _id: currentUser._id }, // query matching , refId should be "ObjectId" type
            { $addToSet: { friends: addedFriend._id } },
            { new: true } //single object will be pushed to attachemnts
          );
          await User.updateOne(
            { _id: addedFriend._id }, // query matching , refId should be "ObjectId" type
            { $addToSet: { friends: currentUser._id } },
            { new: true } //single object will be pushed to attachemnts
          );
        }
      }
      var currentUser = await User.findOne({ _id: ObjectId(_id) }).populate(
        "friends"
      );
      let mutualFriends = currentUser.friends;
      // console.log({ mutualFriends });

      pendingFriends = await PendingUser.find({
        invitedBy: currentUser._id,
      });
      console.log({ pendingFriends, mutualFriends });

      res.json({ pendingFriends, mutualFriends });
    }
  });
  // Receives: token
  // Sends: returns list of available activities
  app.get("/getActivities", authenticateToken, async (req, res) => {
    console.log("HEYOOO");
    let activities = await Activity.find();
    console.log({ activities });
    res.json({ activities });
  });

  // Receives: user id
  // Sends: returns user
  app.get("/getUser/:id", authenticateToken, async (req, res) => {
    res.json({ currentUser: req.savedUser }); //check this -- i just made the change
  });

  // Receives: JWT token & user id
  // Sends: returns user
  app.get("/getUserFriends/:id", async (req, res) => {
    //add existing user.
    const _id = req.params.id;
    const pendingFriends = await PendingUser.find({ invitedBy: _id });
    var usersFriends = await User.find({ friends: req.params.id });
    let mutualFriends = usersFriends.filter((friend) => {
      return friend ? friend.friends.includes(_id) : null;
    });
    // console.log("IM IN THE USER FRIEND FUNCTIOn");

    res.json({ pendingFriends, mutualFriends });
  });

  // Receives: user id, token
  // Sends: all friends of user -- first name, last name, status: active or cancelled
  // all active friends are sent in one portion, inactive friends in another portion
  app.get("/getFriendGrid/:id", authenticateToken, async (req, res) => {
    let { savedUser } = req;
    const usersFriends = await User.find({ friends: req.params.id });
    const { activeFriends, inactiveFriends } = getAvailableFriends(
      usersFriends,
      savedUser
    );
    res.json({ activeFriends, inactiveFriends, currentUser: savedUser });
  });

  const getAvailableFriends = (usersFriends, savedUser) => {
    let activeFriends = usersFriends.filter((friend) => {
      // console.log({ friend });
      return friend
        ? friend.friends.includes(savedUser._id) && friend.status === "active"
        : null;
    });
    let inactiveFriends = usersFriends.filter((friend) => {
      // console.log({ friend });
      return friend
        ? friend.friends.includes(savedUser._id) && friend.status !== "active"
        : null;
    });
    // console.log({ activeFriends });

    // console.log({ inactiveFriends });

    return { activeFriends, inactiveFriends };
  };
};

run();
