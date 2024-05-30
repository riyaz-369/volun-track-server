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

// token verify middleware
const verifyToken = (req, res, next) => {
  const token = req.cookies?.token;
  if (!token) return res.status(401).send({ message: "unauthorized access" });
  if (token) {
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
      if (err) return res.status(401).send({ message: "unauthorized access" });
      req.user = decoded;
      next();
    });
  }
};

async function run() {
  try {
    // jwt token generate
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });
      res
        .cookie("token", token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
        })
        .send({ success: true });
    });

    app.post("/logout", async (req, res) => {
      res.clearCookie("token", { maxAge: 0 }).send({ success: true });
    });

    const data = client.db("volunTrackDB");

    const volunteerCollections = data.collection("volunteers");
    const volunteersReqCollections = data.collection("volunteerRequests");
    const volunteersReqConfirmationCollections = data.collection(
      "volunteerReqConfirmations"
    );

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

    app.get("/volunteers-email", verifyToken, async (req, res) => {
      const email = req?.query?.email;
      const tokenEmail = req?.user?.email;
      if (email !== tokenEmail) {
        return res.status(403).send({ message: "forbidden access" });
      }
      let query = {};
      if (email) {
        query = { organizer_email: email };
      }
      const result = await volunteerCollections.find(query).toArray();
      res.send(result);
    });

    app.post("/volunteers", verifyToken, async (req, res) => {
      const volunteers = req.body;
      const result = await volunteerCollections.insertOne(volunteers);
      res.send(result);
    });

    app.put("/volunteers/:id", verifyToken, async (req, res) => {
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
    app.post("/volunteerRequests", verifyToken, async (req, res) => {
      const result = await volunteersReqCollections.insertOne(req.body);
      res.send(result);
    });

    app.get("/volunteerRequests/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      const tokenEmail = req?.user?.email;
      if (email !== tokenEmail) {
        return res.status(403).send({ message: "forbidden access" });
      }
      let query = {};
      if (email) {
        query = { "volunteer.email": email };
      }
      const result = await volunteersReqCollections.find(query).toArray();
      res.send(result);
    });

    app.get("/allVolunteerRequests", async (req, res) => {
      const result = await volunteersReqCollections.find().toArray();
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

    app.post("/volunteerReqConfirmations", async (req, res) => {
      const item = req.body;
      const result = await volunteersReqConfirmationCollections.insertOne(item);
      res.send(result);
    });

    // apis for pagination
    app.get("/totalVolunteers", async (req, res) => {
      const size = parseInt(req.query.size);
      const page = parseInt(req.query.page) - 1;
      const filter = req.query.filter;
      const search = req.query.search;

      let query = { post_title: { $regex: search, $options: "i" } };
      if (filter) {
        query = { ...query, category: filter };
      }
      const result = await volunteerCollections
        .find(query)
        .sort({ deadline: 1 })
        .skip(page * size)
        .limit(size)
        .toArray();
      res.send(result);
    });

    app.get("/countVolunteers", async (req, res) => {
      const count = await volunteerCollections.countDocuments();
      res.send({ count });
    });

    // await client.db("admin").command({ ping: 1 });
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
