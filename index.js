const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const port = process.env.PORT || 5000;
const app = express();

// middleware
app.use(
  cors({
    origin: ["http://localhost:5173"],
    credentials: true,
  })
);
app.use(express.json());

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

    // volunteers apis
    app.get("/volunteers", async (req, res) => {
      const result = await volunteerCollections.find().toArray();
      res.send(result);
    });

    app.get("/volunteers/:id", async (req, res) => {
      const result = await volunteerCollections.findOne({
        _id: new ObjectId(req.params.id),
      });
      res.send(result);
    });

    app.post("/volunteers", async (req, res) => {
      const volunteers = req.body;
      const result = await volunteerCollections.insertOne(volunteers);
      res.send(result);
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
