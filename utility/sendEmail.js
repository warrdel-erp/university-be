import nodemailer from "nodemailer";
import 'dotenv/config';

export default async function sendEmail(to, subject, link) {
  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      throw new Error("Missing email credentials (EMAIL_USER or EMAIL_PASS) in .env file");
    }

    const transporter = nodemailer.createTransport({
      service: "Gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // const htmlContent = `
    //   <!DOCTYPE html>
    //   <html>
    //     <head>
    //       <meta charset="UTF-8" />
    //       <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    //       <title>Password Reset</title>
    //     </head>
    //     <body style="margin:0;padding:0;background:#f6f9fc;font-family:Arial,Helvetica,sans-serif;">
    //       <table align="center" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px;margin:20px auto;background:#ffffff;border-radius:10px;box-shadow:0 4px 10px rgba(0,0,0,0.1);overflow:hidden;">
    //         <tr style="background:#004aad;">
    //           <td align="center" style="padding:20px;">
    //             <img src="https://stage.hiveerp.com/static/media/edvantage%20logo%20white.e5ee9a85585189cc9565.png" alt="Logo" width="60" height="60" style="display:block;margin-bottom:10px;" />
    //             <h1 style="margin:0;color:#ffffff;font-size:20px;">Edvantage Powered by</h1>
    //             <h5 style="margin:0;color:#ffffff;font-size:14px;">Warrdel Solutions Pvt. Ltd.</h5>
    //           </td>
    //         </tr>

    //         <tr>
    //           <td style="padding:30px;text-align:center;">
    //             <h2 style="color:#333333;font-size:22px;margin-bottom:20px;">Your Password Reset Link is Ready!</h2>
    //             <p style="font-size:16px;color:#555;margin-bottom:30px;">
    //               Hi there! We received a request to reset your password.  
    //               Click the button below to set your new password.
    //             </p>
    //             <a href="${link}" style="background:#004aad;color:#ffffff;text-decoration:none;padding:12px 30px;border-radius:5px;font-size:16px;display:inline-block;">
    //               Reset Password
    //             </a>
    //             <p style="font-size:16px;color:#555;margin-top:30px;">Please do not share this email with anyone to keep your account safe.</p>
    //           </td>
    //         </tr>

    //         <tr style="background:#f6f9fc;">
    //           <td style="padding:20px;text-align:center;font-size:12px;color:#999;">
    //             <p>&copy; ${new Date().getFullYear()} Warrdel Solutions Pvt. Ltd. | Edvantage</p>
    //           </td>
    //         </tr>
    //       </table>
    //     </body>
    //   </html>
    // `;

    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    <title>Password Reset</title>
    <style>
      /* Keyframe animations */
      @keyframes fadeIn {
        0% { opacity: 0; transform: translateY(-10px); }
        100% { opacity: 1; transform: translateY(0); }
      }

      @keyframes pulse {
        0% { box-shadow: 0 0 0 0 rgba(0,74,173,0.6); }
        70% { box-shadow: 0 0 0 10px rgba(0,74,173,0); }
        100% { box-shadow: 0 0 0 0 rgba(0,74,173,0); }
      }

      @keyframes gradientShift {
        0% { background-position: 0% 50%; }
        50% { background-position: 100% 50%; }
        100% { background-position: 0% 50%; }
      }

      /* Animated gradient background */
      .header {
        background: linear-gradient(270deg, #004aad, #0078ff, #004aad);
        background-size: 600% 600%;
        animation: gradientShift 8s ease infinite;
      }

      .fadeIn {
        animation: fadeIn 1s ease-in-out;
      }

      .pulse {
        animation: pulse 2s infinite;
      }
    </style>
  </head>

  <body style="margin:0;padding:0;background:#f6f9fc;font-family:Arial,Helvetica,sans-serif;">
    <table align="center" cellpadding="0" cellspacing="0" width="100%"
      style="max-width:600px;margin:30px auto;background:#ffffff;border-radius:12px;
             box-shadow:0 6px 15px rgba(0,0,0,0.1);overflow:hidden;">

      <!-- Header -->
      <tr class="header fadeIn">
        <td align="center" style="padding:25px;">
          <img src="https://sso.erpedvantage.com/static/media/edvantage%20logo%20white.e5ee9a85585189cc9565.png"
               alt="Edvantage Logo" width="230" height="50"
               style="display:block;margin-bottom:10px;animation:fadeIn 1.5s ease-in-out;" />
          <h5 style="margin:5px 0 0;color:#e3f2fd;font-size:14px;">Powered By Warrdel Solutions Pvt. Ltd.</h5>
        </td>
      </tr>

      <!-- Body -->
      <tr class="fadeIn">
        <td style="padding:35px;text-align:center;">
          <h2 style="color:#333333;font-size:24px;margin-bottom:18px;">Your Password Reset Link is Ready!</h2>
          <p style="font-size:16px;color:#555;margin-bottom:30px;">
            Hi there 👋, we received a request to reset your password.<br />
            Click the button below to set your new password.
          </p>

          <a href="${link}"
             style="background:#004aad;color:#ffffff;text-decoration:none;padding:14px 35px;
                    border-radius:8px;font-size:17px;display:inline-block;transition:all .3s ease;
                    box-shadow:0 4px 10px rgba(0,0,0,0.2);"
             class="pulse">
            🔐 Reset Password
          </a>

          <p style="font-size:14px;color:#777;margin-top:25px;">
            ⏰ This link will expire in <strong>5 minutes</strong>.<br/>
            If you did not request a password reset, please ignore this email.
          </p>

          <p style="font-size:15px;color:#555;margin-top:25px;">
            Please do not share this email with anyone to keep your account safe.
          </p>
        </td>
      </tr>

      <!-- Footer -->
      <tr style="background:#f6f9fc;">
        <td style="padding:20px;text-align:center;font-size:12px;color:#999;">
          <p>&copy; ${new Date().getFullYear()} Warrdel Solutions Pvt. Ltd. | Edvantage</p>
        </td>
      </tr>

    </table>
  </body>
</html>
`;

    const result = await transporter.sendMail({
      from: `"Warrdel Solutions Pvt. Ltd." <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html: htmlContent,
    });

    return result;
  } catch (error) {
    console.error("Error in sendEmail:", error);
    throw new Error("Failed to send email: " + error.message);
  }
}