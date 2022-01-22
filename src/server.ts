require("dotenv").config()
const cors = require("cors")
const express = require("express")
const app = express()
const wss = require("ws")

app.use(cors())
app.use(express.json())

const authRoute = require("./authUser")
const gameRoute = require("./gameAPI")

app.use("/user", authRoute)
app.use("/game", gameRoute)

const server = app.listen(5000, () => {
  console.log("server is listening on port 5000")
})
