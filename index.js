const express = require("express");
const cors = require("cors");
require("dotenv").config();
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const port = process.env.PORT || 5000;
const app = express();

// middleware
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://volun-track-9c5ae.web.app",
      "https://volun-track-9c5ae.firebaseapp.com",
    ],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.308otot.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // await client.connect();

    const volunteerCollections = client
      .db("volunTrackDB")
      .collection("volunteers");

    const volunteersReqCollections = client
      .db("volunTrackDB")
      .collection("volunteerRequests");

    // volunteers apis
    app.get("/volunteers", async (req, res) => {
      const result = await volunteerCollections
        .find()
        .sort({ deadline: 1 })
        .toArray();
      res.send(result);
    });

    app.get("/volunteers/:id", async (req, res) => {
      const result = await volunteerCollections.findOne({
        _id: new ObjectId(req.params.id),
      });
      res.send(result);
    });

    app.get("/volunteers-email", async (req, res) => {
      const email = req?.query?.email;
      let query = {};
      if (email) {
        query = { organizer_email: email };
      }
      const result = await volunteerCollections.find(query).toArray();
      res.send(result);
    });

    app.post("/volunteers", async (req, res) => {
      const volunteers = req.body;
      const result = await volunteerCollections.insertOne(volunteers);
      res.send(result);
    });

    app.put("/volunteers/:id", async (req, res) => {
      const updateData = req.body;
      const filter = { _id: new ObjectId(req.params.id) };
      const options = { upsert: true };
      const updateDoc = {
        $set: {
          ...updateData,
        },
      };
      const result = await volunteerCollections.updateOne(
        filter,
        updateDoc,
        options
      );
      res.send(result);
    });

    app.delete("/volunteers/:id", async (req, res) => {
      const query = { _id: new ObjectId(req.params.id) };
      const result = await volunteerCollections.deleteOne(query);
      res.send(result);
    });

    // volunteers request related apis
    app.post("/volunteerRequests", async (req, res) => {
      const result = await volunteersReqCollections.insertOne(req.body);
      res.send(result);
    });

    app.get("/volunteerRequests", async (req, res) => {
      const email = req.query.email;
      let query = {};
      if (email) {
        query = { "volunteer.email": email };
      }
      const result = await volunteersReqCollections.find(query).toArray();
      res.send(result);
    });

    app.patch("/volunteerRequests/:id", async (req, res) => {
      const filter = { _id: new ObjectId(req.params.id) };
      const updateNum = {
        $inc: {
          no_of_volunteers_needed: -1,
        },
      };
      const result = await volunteerCollections.updateOne(filter, updateNum);
      res.send(result);
    });

    app.delete("/volunteerRequests/:id", async (req, res) => {
      const query = { _id: new ObjectId(req.params.id) };
      const result = await volunteersReqCollections.deleteOne(query);
      res.send(result);
    });

    // apis for pagination
    app.get("/totalVolunteers", async (req, res) => {
      const size = parseInt(req.query.size);
      const page = parseInt(req.query.page) - 1;
      const result = await volunteerCollections
        .find()
        .skip(page * size)
        .limit(size)
        .toArray();
      res.send(result);
    });

    app.get("/countVolunteers", async (req, res) => {
      const count = await volunteerCollections.countDocuments();
      res.send({ count });
    });

    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("VolunTrack Server running");
});

app.listen(port, () => {
  console.log(`server running on port ${port}`);
});
