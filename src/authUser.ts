const exp = require("express")
const router = exp.Router()
const authPool = require("./db")
const jwt = require("jsonwebtoken")
const bcrypt = require("bcrypt")
const nodemailer = require("nodemailer")

router

  .post("/login", async (req: any, res: any) => {
    //check if user exists in db
    const userHandle = req.body.handle
    let user

    try {
      const newUser = await authPool.query(`SELECT * FROM users WHERE user_handle='${userHandle}'`)
      user = newUser.rows[0]
      if (user == null) {
        console.log("user not found")
        return res.status(400).send("Cannot find user")
      }

      try {
        if (await bcrypt.compare(req.body.password, user.user_password)) {
          console.log("password good")
          const accessToken = generateAccessToken(user)
          const refreshToken = jwt.sign(user, process.env.REFRESH_TOKEN_SECRET)
          pushToken(refreshToken)
          res.json({ accessToken: accessToken, refreshToken: refreshToken, data: "Success" })
          console.log("client logged in")
        } else {
          console.log("password bad")
          res.status(403).send("Invalid Password")
        }
      } catch {
        res.status(500).send("SERVER ERROR")
      }
    } catch (error) {
      res.status(500).send("DB REQUEST ERROR")
    }
  })

  //usercreation
  .post("/newuser", async (req: any, res: any) => {
    try {
      const hashedPassword = await bcrypt.hash(req.body.password, 10)
      const user = { name: req.body.name, password: hashedPassword, handle: req.body.handle, email: req.body.email }
      const newUser = await authPool.query(`INSERT INTO users (user_name, user_email, user_handle, user_password, date) VALUES ('${user.name}', '${user.email}','${user.handle}','${user.password}', CURRENT_DATE) RETURNING *`)
      res.json(newUser.rows[0])
    } catch (error) {
      res.status(400)
    }
  })

  //USER LOGOUT
  .delete("/logout", async (req: any, res: any) => {
    try {
      const tokenStatus = await authPool.query(`DELETE FROM tokens WHERE tokens=('${req.body.token}')`)
      res.status(200).send(`${tokenStatus.rowCount} tokens deleted`)
      console.log("client logged out")
    } catch (error) {
      res.status(400).send("ERROR LOGGING OUT")
    }
  })

  //USER password reset
  .post("/resetuser", async (req: any, res: any) => {
    try {
      //const tokenStatus = await authPool.query(`DELETE FROM tokens WHERE tokens=('${req.body.token}')`)
      console.log(`password reset request for ${req.body.handle} at this email: ${req.body.email}`)
      sendResetEmail()
      //res.status(200).send(`${tokenStatus.rowCount} tokens deleted`)
      console.log("passsword reset")
    } catch (error) {
      res.status(400).send("ERROR resetting password")
    }
  })

  //User refresh token
  .post("/refresh", async (req: any, res: any) => {
    if (req.body.token == null) res.status(400).send("ERROR REFRESHING TOKEN")
    try {
      const refreshStatus = await authPool.query(`SELECT * FROM tokens WHERE tokens=('${req.body.token}')`)
      if (refreshStatus.rowCount) {
        jwt.verify(req.body.token, process.env.REFRESH_TOKEN_SECRET, (err: any, user: any) => {
          if (err) res.status(403).send("ERROR TOKEN INVALID")
          user = { name: user.username, id: user.userID, handle: user.userHandle }
          const accessToken = generateAccessToken(user)
          res.json({ accessToken: accessToken })
        })
      }
    } catch (error) {
      res.status(403).send("ERROR TOKEN INVALID")
    }
  })

//UTILITY FUNCTIONS
function generateAccessToken(user: object) {
  return jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: "15m" })
}

async function pushToken(token: string) {
  const tokenStatus = await authPool.query(`INSERT INTO tokens (tokens) VALUES ( '${token}')`)
  return tokenStatus.rows[0]
}

async function sendResetEmail() {
  console.log("here resetting password")
  let testAccount = await nodemailer.createTestAccount()

  // create reusable transporter object using the default SMTP transport
  let transporter = nodemailer.createTransport({
    host: "smtp.ethereal.email",
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: testAccount.user, // generated ethereal user
      pass: testAccount.pass, // generated ethereal password
    },
  })

  // send mail with defined transport object
  let info = await transporter.sendMail({
    from: '"Password Resets" <system@demonseige.com>', // sender address
    to: "justin_dean_young@yahoo.com", // list of receivers
    subject: "Passord Reset Request", // Subject line
    text: "Your password is reset", // plain text body
    html: "<b>Your password is reset</b>", // html body
  })

  console.log("Message sent: %s", info.messageId)
  // Message sent: <b658f8ca-6296-ccf4-8306-87d57a0b4321@example.com>

  // Preview only available when sending through an Ethereal account
  console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info))
  // Preview URL: https://ethereal.email/message/WaQKMgKddxQDoou...
}

module.exports = router
