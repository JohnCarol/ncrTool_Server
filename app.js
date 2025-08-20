const express = require("express");
const app = express();
const { errorHandler } = require("./middleware/errorMiddleware");
const cors = require("cors");
const session = require("express-session");
const methodOverride = require("method-override");
const path = require("path");

if(process.env.NODE_ENV !== 'production')
{
    require('dotenv').config();
}

require("./config/passport");

const sessionConfig = {
  name: "ncrsession",
  secret: "SandvikNCRSecretPa99w0rD11223344",

  resave: false,
  saveUninitialized: true,
  cookie: {
    httpOnly: true,
    expires: Date.now() + 1000 * 60 * 60 * 24 * 1,
    maxAge: 1000 * 60 * 60 * 24 * 1,
  },
};

app.use(session(sessionConfig));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));
app.use(express.static(path.join(__dirname, "public")));

const port = process.env.NCR_PORT;

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

const whitelist = process.env.NCR_WHITELISTED_DOMAINS
  ? process.env.NCR_WHITELISTED_DOMAINS.split(",")
  : [];

console.log(whitelist)

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || whitelist.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },

  credentials: true,
};

app.use(cors(corsOptions));

app.use("/api/auth", require("./routes/authRequest"));
app.use("/api/users", require("./routes/userRequest"));
app.use("/api/kpi", require("./routes/kpiRequest"));
app.use("/api/ncr", require("./routes/ncrRequest"));
app.use("/api/attachments", require("./routes/attachmentRequest"));

app.use(errorHandler);

app.listen(port, () => {
  console.log(`Server is running on PORT ${port}`);
});
