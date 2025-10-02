import nodemailer from 'nodemailer';

export default async function sendEmail(to, subject, link) {
  const transporter = nodemailer.createTransport({
    service: "Gmail",
    auth: {
      user: 'ykuldeep624@gmail.com',
      pass: 'oner ldmu twac lqfo'
    },
  });

  const htmlContent = `
  <!DOCTYPE html>
  <html>
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
      <title>Password Reset</title>
    </head>
    <body style="margin:0;padding:0;background:#f6f9fc;font-family:Arial,Helvetica,sans-serif;">
      <table align="center" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px;margin:20px auto;background:#ffffff;border-radius:10px;box-shadow:0 4px 10px rgba(0,0,0,0.1);overflow:hidden;">
        <tr style="background:#004aad;">
          <td align="center" style="padding:20px;">
            <img src="https://upload.wikimedia.org/wikipedia/commons/8/88/OOjs_UI_icon_user-avatar.svg" alt="Logo" width="60" height="60" style="display:block;margin-bottom:10px;" />
            <h1 style="margin:0;color:#ffffff;font-size:20px;">Warrdel Solutions Pvt. Ltd.</h1>
            <p style="margin:0;color:#ffffff;font-size:14px;">Powered by Edvantage</p>
          </td>
        </tr>

        <tr>
          <td style="padding:30px;text-align:center;">
            <h2 style="color:#333333;font-size:22px;margin-bottom:20px;">Your Password Reset Link is Ready!</h2>
            <p style="font-size:16px;color:#555;margin-bottom:30px;">
              Hi there! We received a request to reset your password.  
              Click the button below to set your new password.
            </p>
            <a href="${link}" style="background:#004aad;color:#ffffff;text-decoration:none;padding:12px 30px;border-radius:5px;font-size:16px;display:inline-block;">
              Reset Password
            </a>
            <p style="font-size:14px;color:#777;margin-top:30px;">
              Or copy and paste this link into your browser:
            </p>
            <p style="font-size:12px;color:#004aad;word-wrap:break-word;">${link}</p>
          </td>
        </tr>

        <tr style="background:#f6f9fc;">
          <td style="padding:20px;text-align:center;font-size:12px;color:#999;">
            <p>Please do not share this email with anyone to keep your account safe.</p>
            <p>&copy; ${new Date().getFullYear()} Warrdel Solutions Pvt. Ltd. | Edvantage</p>
          </td>
        </tr>
      </table>
    </body>
  </html>
  `;

  await transporter.sendMail({
    from: `"Warrdel Solutions Pvt. Ltd." <${'ykuldeep624@gmail.com'}>`,
    to,
    subject,
    html: htmlContent,
  });
}
