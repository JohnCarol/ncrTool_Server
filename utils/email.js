const nodemailer = require("nodemailer");

const sendEmail = {};

// const createTestAccount = async () => {
//   let testAccount = await nodemailer.createTestAccount();

//   let transporter = nodemailer.createTransport({
//     host: "smtp.ethereal.email",
//     port: 587,
//     secure: false, // true for 465, false for other ports
//     auth: {
//       user: testAccount.user, // generated ethereal user
//       pass: testAccount.pass, // generated ethereal password
//     },
//   });

//   return transporter;
// };

const createAccount = async () => {

  const transporter = nodemailer.createTransport({
    //host: "smtp.sandvik.com",
    host: "kwatani-com.mail.protection.outlook.com",
    port: 25,
    secure: false, // true for 465, false for other ports
    // auth: {
    //   user: "srp.sizing_za@sandvik.com", // generated ethereal user
    //   pass: "domain2023xdomain2023x", // generated ethereal password
    // },
  });
  return transporter;
};

sendEmail.verify = async (token, user, origin) => {
  let authURL = `${origin}/auth/reset_password?authToken=${token}`;

  try {
    const transporter = await createAccount();

    await transporter.sendMail({
      from: '"SANDVIK Screen Sizing" <noreply@kwatani.com>', // sender address
      to: user.email, // list of receivers
      //to: "john.bukenya@sandvik.com", // list of receivers
      subject: "SANDVIK Screen Sizing Account Verification/Password Reset link", // Subject line
      html: `Good day ${user.name} ${user.surname}<br/><br/>Please <a href = ${authURL}>click here</a> to reset your account password.<br><br>Kind Regards<br/>SRP Sizing Tool Team`, // html body
    });
    return (
      "Verification email sent successfully."
    );
  } catch (err) {
    return err.message;
  }
};

sendEmail.notify = async (user, id, subject, orgin) => {  

  const { email: userEmail, label: userName } = user;
  let url = `${orgin}/design/${id}`;  

  const transporter = await createAccount();

  try {
    const result = await transporter.sendMail({
      from: '"SANDVIK Screen Sizing" <noreply@kwatani.com>', // sender address
      to: userEmail, // list of receivers
      subject: "Notification - " + subject, // Subject line
      html: `Good day ${userName}<br><br>You have been assigned a Drawing Request to review. Please click <a href = ${url}>here</a> to view.<br><br>Kind Regards`, // html body
    });
    

    return (
      "Notification email sent successfully." + result
    );
  } catch (err) {
    console.log(err.message)
    return err.message;

  }
};

sendEmail.ticketReply = async (ticketData, origin) => {
  let url = origin;

  const transporter = await createAccount();

  try {
    await transporter.sendMail({
      from: '"SANDVIK Screen Sizing" <noreply@kwatani.co.za>', // sender address
      to: ticketData.email, // list of receivers
      subject: "Notification - Reply to ticket: " + ticketData.subject, // Subject line
      html: `Good day ${ticketData.name}<br><br>You have a new reply to a ticket: ${ticketData.subject}. Please <a href = ${url}>login</a> to view.<br><br>Kind Regards`, // html body
    });

    return (
      "Notification email sent successfully. " +
      nodemailer.getTestMessageUrl(info)
    );
  } catch (err) {
    return err.message;
  }
};

module.exports = sendEmail;
