const Gexp = require("express")
const rout = Gexp.Router()
const uid = require("uniqid")
const gamePool = require("./db")
const gjwt = require("jsonwebtoken")

rout

  //joining an existing game
  .post("/join", authenticateToken, async (req: any, res: any) => {
    //check if user exists in db
    console.log("here")
    console.log(req.body)
    /* const userHandle = req.body.handle
    let user
    try {
      const newUser = await gamePool.query(`SELECT * FROM users WHERE user_handle='${userHandle}'`)
      user = newUser.rows[0]
      if (user == null) {
        return res.status(400).send("Cannot find user")
      }
    } catch (error) {
      res.status(500).send("NO USER")
    } */
  })

  //creating new game
  .post("/newgame", authenticateToken, async (req: any, res: any) => {
    try {
      //once token validated, you can create a game
      const myID = uid()
      const myGame = {
        mode: req.body.mode,
      }

      const myNewGame = await gamePool.query(`INSERT INTO games (gameid, gamemode, datecreated, gamestatus) VALUES ( '${myID}','${myGame.mode}', CURRENT_DATE, 'New') RETURNING *`)
      console.log(myNewGame.rows[0])
      res.json(myNewGame.rows[0])
    } catch (error) {
      res.status(400)
    }
  })

  //leaving game
  .delete("/leave", async (req: any, res: any) => {
    try {
      const tokenStatus = await gamePool.query(`DELETE FROM tokens WHERE tokens=('${req.body.token}')`)
      res.status(200).send(`${tokenStatus.rowCount} tokens deleted`)
    } catch (error) {
      res.status(400).send("ERROR LOGGING OUT")
    }
  })

//UTILITY FUNCTIONS
function authenticateToken(req: any, res: any, next: any) {
  const authHeader = req.headers["authorization"]
  const token = authHeader && authHeader.split(" ")[1]
  if (token == null) return res.sendStatus(401)
  console.log(`token: ${token}`)
  gjwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err: any, user: any) => {
    console.log(err)
    if (err) return res.sendStatus(403)
    req.user = user
    next()
  })
}

module.exports = rout
